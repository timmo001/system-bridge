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
import { IAudioMetadata, parseFile, selectCover } from "music-metadata";
import { join, resolve, basename } from "path";
import autoUpdater from "update-electron-app";
import devTools, { REACT_DEVELOPER_TOOLS } from "electron-devtools-installer";
import execa from "execa";
import queryString from "query-string";
import semver from "semver";
import si, { Systeminformation } from "systeminformation";
import WebSocket from "ws";

import {
  appIconPath,
  appSmallIconPath,
  getSettings,
  setSetting,
  wsSendEvent,
} from "./common";
import { closePlayerWindow, PlayerStatus, savePlayerCover } from "./player";
import { startServer, stopServer } from "./api";
import electronIsDev from "./electronIsDev";
import logger from "./logger";
import axios from "axios";

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
  `System Bridge ${app.getVersion()}: ${JSON.stringify(process.argv)}`
);

const isDev = electronIsDev();

handleSquirrelEvent();

// if (isDev)
//   debug({ devToolsMode: "detach", isEnabled: true, showDevTools: false });

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
      app.quit();
      break;
    case "--squirrel-uninstall":
      // Remove desktop and start menu shortcuts
      await spawnUpdate(["--removeShortcut", exeName]);
      app.quit();
      break;
    case "--squirrel-obsolete":
      app.quit();
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
  { label: "Quit", type: "normal", click: quitApp },
];

async function setAppConfig(): Promise<void> {
  const config = getSettings();
  if (!isDev) {
    const launchOnStartup = config.general?.items.launchOnStartup?.value;
    app.setLoginItemSettings({
      openAtLogin:
        typeof launchOnStartup === "boolean" ? launchOnStartup : false,
    });
  }
}

let configurationWindow: BrowserWindow, tray: Tray, ws: WebSocket;
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
    width: 1280,
    height: 720,
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
      submenu: [{ label: "Quit Application", type: "normal", click: quitApp }],
    },
    ...helpMenu,
  ]);
  Menu.setApplicationMenu(menu);

  if (isDev) {
    try {
      await devTools(REACT_DEVELOPER_TOOLS);
    } catch (error) {
      logger.warning("Error adding dev tools:", error);
    }
  } else {
    autoUpdater();
  }

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
  }?${queryString.stringify({ id: "configuration", title: "Settings" })}`;
  logger.info(`Configuration URL: ${url}`);

  configurationWindow.loadURL(url);
  configurationWindow.show();

  // if (isDev) {
  //   // Open the DevTools.
  //   configurationWindow.webContents.openDevTools();
  //   configurationWindow.maximize();
  // }
}

function quitApp(): void {
  tray?.destroy();
  configurationWindow?.destroy();
  app.quit();
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

  startServer();
  ws = await wsSendEvent({ name: "startup", data: "started" }, ws, true);
  ipcMain.emit("get-app-information");
  ipcMain.emit("update-check");
});

export async function getAppInformation(): Promise<
  ApplicationInfo | undefined
> {
  const settings = getSettings();
  const port: number =
    typeof settings?.network.items?.port?.value === "number"
      ? settings?.network.items?.port?.value
      : 9170;
  const websocketPort: number =
    typeof settings?.network.items?.wsPort?.value === "number"
      ? settings?.network.items?.wsPort?.value
      : 9172;
  const osInfo: Systeminformation.OsData = await si.osInfo();
  const uuidInfo: Systeminformation.UuidData = await si.uuid();
  const defaultInterface: string = await si.networkInterfaceDefault();
  const networkInterface: Systeminformation.NetworkInterfacesData | undefined =
    (await si.networkInterfaces()).find(
      (ni: Systeminformation.NetworkInterfacesData) =>
        ni.iface === defaultInterface
    );

  if (networkInterface) {
    const data: ApplicationInfo = {
      address: `http://${osInfo.fqdn}:${port}`,
      fqdn: osInfo.fqdn,
      host: osInfo.hostname,
      ip: networkInterface.ip4,
      mac: networkInterface.mac,
      port,
      updates: await getUpdates(),
      uuid: uuidInfo.os,
      version: app.getVersion(),
      websocketAddress: `ws://${osInfo.fqdn}:${websocketPort}`,
      websocketPort,
    };
    logger.info(`Application info: ${JSON.stringify(data)}`);
    return data;
  }
  return undefined;
}

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

ipcMain.on("get-app-information", async (event): Promise<void> => {
  const data = await getAppInformation();
  event?.sender?.send("app-information", data);
  ws = await wsSendEvent({ name: "app-information", data: data }, ws, true);
});

ipcMain.on("update-check", async (event): Promise<void> => {
  const update = await getUpdates();
  if (update?.available) {
    event?.sender?.send("update-available", update);
    ws = await wsSendEvent(
      { name: "update-available", data: update },
      ws,
      true
    );
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

ipcMain.on("get-settings", async (event): Promise<void> => {
  event?.sender?.send("set-settings", getSettings());
});

ipcMain.on("update-setting", async (event, args): Promise<void> => {
  logger.debug(`update-setting: ${args[0]}, ${args[1]}`);
  await setSetting(args[0], args[1]);
  await setAppConfig();
  event?.sender?.send("updated-setting", args);
  ipcMain.emit("updated-setting", args);
});

ipcMain.on("restart-app", async (event): Promise<void> => {
  event?.sender?.send("restarting-app");
  ipcMain.emit("restarting-app");
  logger.debug("restarting-app");
  app.relaunch();
});

ipcMain.on("restart-server", async (event): Promise<void> => {
  event?.sender?.send("restarting-server");
  ipcMain.emit("restarting-server");
  await stopServer();
  setTimeout(() => startServer(), 2000);
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

ipcMain.on(
  "log",
  (_event, { message, level }: { message: string; level: string }) => {
    logger.log(level, message);
  }
);

ipcMain.on("get-audio-metadata", async (event, path: string) => {
  const metadata: IAudioMetadata = await parseFile(path);
  let cover = selectCover(metadata.common.picture)?.data.toString("base64");
  cover = cover && `data:image/png;base64, ${cover}`;

  event?.sender?.send("audio-metadata", {
    album: metadata.common.album || "",
    artist: metadata.common.artist || metadata.common.albumartist || "",
    cover,
    title: metadata.common.title || "",
  });

  await savePlayerCover(cover);

  ws = await wsSendEvent(
    { name: "player-cover-ready", data: undefined },
    ws,
    true
  );
});

ipcMain.on(
  "player-status",
  async (_event, playerStatus: PlayerStatus): Promise<void> => {
    logger.debug(`player-status: ${JSON.stringify(playerStatus)}`);
    await setSetting("player-status", playerStatus);
    if (!playerStatus) await savePlayerCover();
    ws = await wsSendEvent(
      { name: "player-status", data: playerStatus },
      ws,
      true
    );
  }
);

ipcMain.on("player-cover-ready", async (): Promise<void> => {
  logger.debug("ipcMain: player-cover-ready");
  ws = await wsSendEvent(
    { name: "player-cover-ready", data: undefined },
    ws,
    true
  );
});

ipcMain.on("player-thumbnail-ready", async (): Promise<void> => {
  logger.debug("ipcMain: player-thumbnail-ready");
  ws = await wsSendEvent(
    { name: "player-cover-ready", data: undefined },
    ws,
    true
  );
});
