import {
  app,
  BrowserWindow,
  Menu,
  MenuItemConstructorOptions,
  Notification,
  protocol,
  shell,
  Tray,
} from "electron";
import { Connection } from "typeorm";
import { join, resolve, basename } from "path";
import axios from "axios";
import execa, { ExecaReturnValue } from "execa";
import queryString from "query-string";
import semver from "semver";

import {
  appIconPath,
  appSmallIconPath,
  getConnection,
  getSettingsObject,
} from "./common";
import {
  closePlayerWindow,
  createPlayerWindow,
  getAudioMetadata,
  mutePlayerWindow,
  pausePlayerWindow,
  playpausePlayerWindow,
  playPlayerWindow,
  savePlayerCover,
  seekPlayerWindow,
  volumePlayerWindow,
} from "./player";
import { Event } from "./types/event.entity";
import { WebSocketConnection } from "./websocket";
import electronIsDev from "./electronIsDev";
import logger from "./logger";

export interface ApplicationInfo {
  address: string;
  fqdn: string;
  host: string;
  ip: string;
  mac: string;
  port: number;
  updates?: ApplicationUpdate;
  uuid: string;
  version: string;
  websocketAddress: string;
  websocketPort: number;
}

export interface ApplicationUpdate {
  available: boolean;
  url: string;
  version: { current: string; new: string };
}

export const GITHUB_REPOSITORY = "timmo001/system-bridge";

logger.info(
  "-----------------------------------------------------------------------------------------------------------------------"
);
logger.info(
  `System Bridge ${app.getVersion()}: ${JSON.stringify(process.argv)}`
);
logger.info(
  "-----------------------------------------------------------------------------------------------------------------------"
);

const isDev = electronIsDev();

handleSquirrelEvent();

async function handleSquirrelEvent(): Promise<void> {
  if (process.argv.length === 1) {
    return;
  }

  const appFolder = resolve(process.execPath, "..");
  const rootAtomFolder = resolve(appFolder, "..");
  const updateDotExe = resolve(join(rootAtomFolder, "Update.exe"));
  const exeName = basename(process.execPath);

  async function spawn(
    command: string,
    args: string[] | readonly string[] | undefined
  ) {
    logger.info(`spawn: ${command} ${JSON.stringify(args)}`);
    let stdout, stderr;

    try {
      const { stdout, stderr } = await execa(command, args);
      logger.info(JSON.stringify({ stdout, stderr }));
    } catch (error) {
      logger.error(error);
    }

    return { stdout, stderr };
  }

  async function spawnUpdate(args: string[] | readonly string[] | undefined) {
    return await spawn(updateDotExe, args);
  }

  const squirrelEvent = process.argv[1];
  switch (squirrelEvent) {
    default:
      break;
    case "--squirrel-install":
    case "--squirrel-updated":
      // Install desktop and start menu shortcuts
      await spawnUpdate(["--createShortcut", exeName]);
      quitApp();
      break;
    case "--squirrel-uninstall":
      // Remove desktop and start menu shortcuts
      await spawnUpdate(["--removeShortcut", exeName]);
      quitApp();
      break;
    case "--squirrel-obsolete":
      quitApp();
      break;
    case "--squirrel-firstrun":
      // Install desktop and start menu shortcuts
      spawnUpdate(["--createShortcut", exeName]);
      break;
  }
}

if (!isDev) {
  execa
    .node("dist/main.js", [], { cwd: "api" })
    .then((stdout: ExecaReturnValue<string>) => logger.info(stdout))
    .catch((stderr: ExecaReturnValue<string>) => logger.error(stderr));

  process.on("unhandledRejection", (error: Error) =>
    logger.error("unhandledRejection:", error)
  );

  process.on("uncaughtException", (error: Error) =>
    logger.error("uncaughtException:", error)
  );
}

const helpMenu: Array<MenuItemConstructorOptions> = [
  {
    label: "Help",
    submenu: [
      {
        label: "Suggest a Feature",
        type: "normal",
        click: () =>
          shell.openExternal(
            "https://github.com/timmo001/system-bridge/issues/new/choose"
          ),
      },
      {
        label: "Report an issue",
        type: "normal",
        click: () =>
          shell.openExternal(
            "https://github.com/timmo001/system-bridge/issues/new/choose"
          ),
      },
      {
        label: "Discussions",
        type: "normal",
        click: () =>
          shell.openExternal(
            "https://github.com/timmo001/system-bridge/discussions"
          ),
      },
      { type: "separator" },
      {
        label: "Logs",
        type: "normal",
        click: () =>
          shell.openPath(join(app.getPath("userData"), "system-bridge.log")),
      },
      { type: "separator" },
      {
        label: "About",
        type: "normal",
        click: () => app.showAboutPanel(),
      },
    ],
  },
];

const contextMenuTemplate: Array<MenuItemConstructorOptions> = [
  { label: "Settings", type: "normal", click: () => showConfigurationWindow() },
  { type: "separator" },
  {
    label: "Close Active Media Player",
    type: "normal",
    click: closePlayerWindow,
  },
  { type: "separator" },
  {
    id: "version-latest",
    label: "Latest Version",
    type: "normal",
    click: () =>
      shell.openExternal(
        "https://github.com/timmo001/system-bridge/releases/latest"
      ),
  },
  ...helpMenu,
  { type: "separator" },
  { label: "Quit", type: "normal", click: async () => await quitApp() },
];

let configurationWindow: BrowserWindow, tray: Tray;
async function setupApp(): Promise<void> {
  protocol.registerFileProtocol("safe-file-protocol", (request, callback) => {
    const url = request.url.replace("safe-file-protocol://", "");
    try {
      return callback(decodeURIComponent(url));
    } catch (error) {
      logger.error(error);
    }
  });

  configurationWindow = new BrowserWindow({
    width: 1400,
    height: 860,
    autoHideMenuBar: true,
    focusable: true,
    icon: appIconPath,
    maximizable: true,
    minimizable: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      preload: join(__dirname, "./preload.js"),
      // devTools: electronIsDev(),
    },
  });

  const menu = Menu.buildFromTemplate([
    {
      label: "File",
      submenu: [
        {
          label: "Quit Application",
          type: "normal",
          click: async () => await quitApp(),
        },
      ],
    },
    ...helpMenu,
  ]);
  Menu.setApplicationMenu(menu);

  configurationWindow.on("close", (event) => {
    event.preventDefault();
    configurationWindow.hide();
  });

  try {
    app.dock?.hide();
  } catch (e) {
    if (e.message) logger.warn(e.message);
  }
}

async function showConfigurationWindow(): Promise<void> {
  const url = `${
    isDev
      ? "http://localhost:3000/"
      : `file://${join(app.getAppPath(), "frontend/build/index.html")}`
  }?${queryString.stringify({
    id: "configuration",
    title: "Settings",
    apiKey: settings["network-apiKey"],
    apiPort: settings["network-apiPort"] || 9170,
    wsPort: settings["network-wsPort"] || 9172,
  })}`;
  logger.info(`Configuration URL: ${url}`);

  configurationWindow.loadURL(url);
  configurationWindow.show();

  // if (isDev) {
  //   // Open the DevTools.
  //   configurationWindow.webContents.openDevTools();
  //   configurationWindow.maximize();
  // }
}

async function quitApp(): Promise<void> {
  configurationWindow?.destroy();
  closePlayerWindow();
  // await stopServer();
  tray?.destroy();
  app.exit(0);
  process.exit(0);
}

async function setupWsConnection(): Promise<void> {
  try {
    ws = new WebSocketConnection(
      Number(settings["network-wsPort"]) || 9172,
      settings["network-apiKey"],
      true,
      () => ws.sendEvent({ name: "startup" })
    );
    ws.onEvent = async (event: Event) => {
      logger.info(`Event: ${event.name}`);
      switch (event.name) {
        default:
          break;
        case "player-close":
          closePlayerWindow();
          break;
        case "player-cover-clear":
          await savePlayerCover();
          break;
        case "player-open":
          await createPlayerWindow(event.data);
          break;
        case "player-mute":
          mutePlayerWindow(event.data.value as boolean);
          break;
        case "player-pause":
          pausePlayerWindow();
          break;
        case "player-play":
          playPlayerWindow();
          break;
        case "player-playpause":
          playpausePlayerWindow();
          break;
        case "player-seek":
          seekPlayerWindow(event.data.value as number);
          break;
        case "player-stop":
          closePlayerWindow();
          break;
        case "player-volume":
          volumePlayerWindow(event.data.value as number);
          break;
        case "player-volumeDown":
          volumePlayerWindow(event.data.value as number, "down");
          break;
        case "player-volumeUp":
          volumePlayerWindow(event.data.value as number, "up");
          break;
        case "media-get-source":
          setTimeout(
            async () =>
              ws.sendEvent({
                name: "media-source",
                data: await getAudioMetadata(event.data.path),
              }),
            4000
          );
          break;
        case "restart-server":
          console.log("restart-server:", event);
          await ws.close();
          setTimeout(async () => {
            settings = await getSettingsObject(connection);
            await setupWsConnection();
          }, 2000);
          break;
        case "open-rtc":
          try {
            const rtc = await import("./rtc");
            rtc.createRTCWindow();
          } catch (e) {
            logger.warn("Couldn't create RTC window: ", e);
          }
          break;
        case "open-settings":
          await showConfigurationWindow();
          break;
        case "update-app-config":
          await updateAppConfig(true);
          break;
      }
    };
  } catch (e) {
    logger.error(e);
    setTimeout(async () => await setupWsConnection(), 4000);
  }
}

let connection: Connection,
  settings: { [key: string]: string },
  ws: WebSocketConnection;
(async () => {
  connection = await getConnection();
  settings = await getSettingsObject(connection);
  await updateAppConfig(false);
  await setupWsConnection();
})();

async function updateAppConfig(updateSettings: boolean): Promise<void> {
  if (updateSettings) settings = await getSettingsObject(connection);
  const launchOnStartup =
    settings["general-launchOnStartup"] === "true" || false;
  logger.info(
    `Update App Configuration - Launch on startup: ${launchOnStartup}`
  );
  app.setLoginItemSettings({
    openAtLogin: isDev ? false : launchOnStartup,
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", setupApp);

app.on("activate", (): void => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    setupApp();
  }
});

app.whenReady().then(async (): Promise<void> => {
  tray = new Tray(appSmallIconPath);
  tray.setToolTip("System Bridge");
  tray.setContextMenu(Menu.buildFromTemplate(contextMenuTemplate));
  tray.setIgnoreDoubleClickEvents(true);
  tray.on("double-click", () => showConfigurationWindow());

  // TODO: Implement
  // ipcMain.emit("get-app-information");
  updateCheck();
});

export async function getUpdates(): Promise<ApplicationUpdate | undefined> {
  const response = await axios.get<{
    html_url: string;
    prerelease: boolean;
    tag_name: string;
  }>(`https://api.github.com/repos/${GITHUB_REPOSITORY}/releases/latest`);
  if (
    response &&
    response.status < 400 &&
    response.data?.prerelease === false
  ) {
    const versionCurrent = semver.clean(app.getVersion()) as string;
    const versionNew = semver.clean(response.data.tag_name) as string;
    const available = semver.lt(versionCurrent, versionNew);
    return {
      available,
      url: response.data.html_url,
      version: { current: versionCurrent, new: versionNew },
    };
  }
  return undefined;
}

export async function updateCheck(): Promise<void> {
  const update = await getUpdates();
  if (update?.available) {
    if (ws) ws.sendEvent({ name: "update-available", data: update });
    contextMenuTemplate[
      contextMenuTemplate.findIndex(
        (mi: MenuItemConstructorOptions) => mi.id === "version-latest"
      )
    ].label = `Version ${update.version.new} Avaliable!`;
    tray.setContextMenu(Menu.buildFromTemplate(contextMenuTemplate));
    const notification = new Notification({
      title: "System Bridge - Update Avaliable!",
      body: `Version ${update.version.new} is available.`,
    });
    notification.on("click", () => shell.openExternal(update.url));
    notification.show();
  }
}
