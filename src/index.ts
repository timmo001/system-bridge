import {
  app,
  BrowserWindow,
  ipcMain,
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
import execa from "execa";
import queryString from "query-string";
import semver from "semver";

import {
  appIconPath,
  appSmallIconPath,
  getConnection,
  getSetting,
  getSettingsObject,
} from "./common";
import { closePlayerWindow } from "./player";
import electronIsDev from "./electronIsDev";
import logger from "./logger";
import { WebSocketConnection } from "./websocket";

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
  logger.info(`squirrelEvent: ${squirrelEvent}`);
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
  { label: "Settings", type: "normal", click: showConfigurationWindow },
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

let connection: Connection,
  settings: { [key: string]: string },
  ws: WebSocketConnection;
(async () => {
  connection = await getConnection();
  settings = await getSettingsObject(connection);
  ws = new WebSocketConnection(
    Number(settings["network-wsPort"]) || 9172,
    settings["network-apiKey"],
    () => ws.sendEvent({ name: "startup" })
  );
})();

async function setAppConfig(): Promise<void> {
  if (!isDev) {
    const launchOnStartup = (
      await getSetting(connection, "general-launchOnStartup")
    )?.value;
    app.setLoginItemSettings({
      openAtLogin: launchOnStartup ? Boolean(launchOnStartup) : false,
    });
  }
}

let configurationWindow: BrowserWindow, tray: Tray;
async function setupApp(): Promise<void> {
  protocol.registerFileProtocol("safe-file-protocol", (request, callback) => {
    const url = request.url.replace("safe-file-protocol://", "");
    try {
      return callback(decodeURIComponent(url));
    } catch (error) {
      // Handle the error as needed
      console.error(error);
    }
  });

  configurationWindow = new BrowserWindow({
    width: 1340,
    height: 760,
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

  setAppConfig();

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
    app.dock.hide();
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
  tray.on("double-click", showConfigurationWindow);

  ipcMain.emit("get-app-information");
  ipcMain.emit("update-check");
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

ipcMain.on("update-check", async (event): Promise<void> => {
  const update = await getUpdates();
  if (update?.available) {
    event?.sender?.send("update-available", update);
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
});

ipcMain.on("open-url", async (event, arg): Promise<void> => {
  shell.openExternal(arg);
  event?.sender?.send("opened-url", arg);
});

ipcMain.on("open-settings", async (event): Promise<void> => {
  showConfigurationWindow();
  event?.sender?.send("opened-settings");
});

ipcMain.on("restart-app", async (event): Promise<void> => {
  event?.sender?.send("restarting-app");
  ipcMain.emit("restarting-app");
  logger.debug("restarting-app");
  app.relaunch();
  await quitApp();
});

ipcMain.on("window-show", (event) => {
  const window = BrowserWindow.fromWebContents(event?.sender);
  window?.show();
});

ipcMain.on("window-hide", (event) => {
  BrowserWindow.fromWebContents(event?.sender)?.hide();
});

ipcMain.on("window-minimize", (event) => {
  BrowserWindow.fromWebContents(event?.sender)?.minimize();
});

ipcMain.on("window-close", (event) => {
  BrowserWindow.fromWebContents(event?.sender)?.close();
});
