import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  MenuItemConstructorOptions,
  screen,
  shell,
  Tray,
} from "electron";
import { BrowserWindowConstructorOptions } from "electron/main";
import { IAudioMetadata, parseFile, selectCover } from "music-metadata";
import { join, resolve, basename } from "path";
import debug from "electron-debug";
import devTools, { REACT_DEVELOPER_TOOLS } from "electron-devtools-installer";
import electronSettings from "electron-settings";
import execa from "execa";
import isDev from "electron-is-dev";
import queryString from "query-string";
import si, { Systeminformation } from "systeminformation";
import updateApp from "update-electron-app";

import { getSettings } from "./utils";
import { MediaCreateData } from "./types/media";
import API from "./api";
import logger from "./logger";

logger.info(
  `System Bridge ${app.getVersion()}: ${JSON.stringify(process.argv)}`
);

handleSquirrelEvent();

if (isDev)
  debug({ devToolsMode: "detach", isEnabled: true, showDevTools: false });

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

export const appIconPath = join(
  app.getAppPath(),
  "./public/system-bridge-circle.png"
);

export const appSmallIconPath = join(
  app.getAppPath(),
  "./public/system-bridge-circle-32x32.png"
);

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

let configurationWindow: BrowserWindow,
  playerWindow: BrowserWindow | undefined,
  rtcWindow: BrowserWindow | undefined,
  tray: Tray,
  api: API | undefined;
async function setupApp(): Promise<void> {
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
      devTools: isDev,
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
    updateApp();
  }

  configurationWindow.on("close", (event) => {
    event.preventDefault();
    configurationWindow.hide();
  });

  try {
    app.dock.hide();
  } catch (e) {
    logger.warn(e);
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
  configurationWindow.focus();

  // if (isDev) {
  //   // Open the DevTools.
  //   configurationWindow.webContents.openDevTools();
  //   configurationWindow.maximize();
  // }
}

export async function createPlayerWindow(data: MediaCreateData): Promise<void> {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const windowOpts: BrowserWindowConstructorOptions = {
    width: data.type === "audio" ? 460 : 480,
    height: data.type === "audio" ? 130 : 270,
    x: data.x || width - (data.type === "audio" ? 480 : 500),
    y: data.y || height - (data.type === "audio" ? 150 : 290),
    minHeight: 100,
    minWidth: 120,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    backgroundColor: data.transparent
      ? undefined
      : data.backgroundColor || "#121212",
    focusable: true,
    frame: false,
    fullscreenable: data.type === "video",
    icon: appIconPath,
    maximizable: false,
    minimizable: true,
    opacity: data.opacity,
    show: false,
    thickFrame: true,
    titleBarStyle: "hidden",
    transparent: true,
    webPreferences: {
      contextIsolation: true,
      preload: join(__dirname, "./preload.js"),
      devTools: isDev,
    },
  };

  logger.debug(JSON.stringify(windowOpts));

  playerWindow = new BrowserWindow(windowOpts);

  playerWindow.webContents.setWindowOpenHandler(() => ({
    action: "deny",
  }));

  playerWindow.webContents.on("will-navigate", (event: Event) =>
    event.preventDefault()
  );

  const url = `${
    isDev
      ? "http://localhost:3000/"
      : `file://${join(app.getAppPath(), "frontend/build/index.html")}`
  }?${queryString.stringify({ ...data, id: "player", title: "Player" })}`;
  logger.info(`Player URL: ${url}`);

  playerWindow.setVisibleOnAllWorkspaces(true);
  playerWindow.loadURL(url);
  if (data.hidden) playerWindow.hide();
  else {
    playerWindow.show();
    playerWindow.focus();
  }

  if (isDev) {
    try {
      await devTools(REACT_DEVELOPER_TOOLS);
    } catch (error) {
      logger.warning("Error adding dev tools:", error);
    }
    // Open the DevTools.
    // playerWindow.webContents.openDevTools({ activate: true, mode: "detach" });
  }
}

export function closePlayerWindow(): boolean {
  if (playerWindow) {
    if (!playerWindow.isDestroyed()) {
      playerWindow.close();
    }
    playerWindow = undefined;
    return true;
  }
  return false;
}

export function pausePlayerWindow(): boolean {
  if (playerWindow && !playerWindow.isDestroyed()) {
    logger.debug("player-pause");
    playerWindow.webContents.send("player-pause");
    return true;
  }
  return false;
}

export function playPlayerWindow(): boolean {
  if (playerWindow && !playerWindow.isDestroyed()) {
    logger.debug("player-play");
    playerWindow.webContents.send("player-play");
    return true;
  }
  return false;
}

export function playpausePlayerWindow(): boolean {
  if (playerWindow && !playerWindow.isDestroyed()) {
    logger.debug("player-playpause");
    playerWindow.webContents.send("player-playpause");
    return true;
  }
  return false;
}

export async function createRTCWindow(): Promise<void> {
  const windowOpts: BrowserWindowConstructorOptions = {
    width: 1920,
    height: 1080,
    minHeight: 100,
    minWidth: 120,
    alwaysOnTop: false,
    autoHideMenuBar: true,
    backgroundColor: "#121212",
    closable: false,
    focusable: true,
    frame: true,
    fullscreenable: true,
    icon: appIconPath,
    maximizable: true,
    minimizable: true,
    show: false,
    thickFrame: true,
    titleBarStyle: "default",
    webPreferences: {
      contextIsolation: true,
      preload: join(__dirname, "./preload.js"),
      devTools: isDev,
    },
  };

  rtcWindow = new BrowserWindow(windowOpts);

  const url = `${
    isDev
      ? "http://localhost:3000/"
      : `file://${join(app.getAppPath(), "frontend/build/index.html")}`
  }?${queryString.stringify({ id: "webrtc", title: "Video Chat" })}`;
  logger.info(`WebRTC URL: ${url}`);

  rtcWindow.setVisibleOnAllWorkspaces(true);
  rtcWindow.loadURL(url);
  rtcWindow.hide();

  rtcWindow.on("closed", () => {
    if (rtcWindow && !rtcWindow.isDestroyed()) rtcWindow.destroy();
    createRTCWindow();
  });

  if (isDev) {
    try {
      await devTools(REACT_DEVELOPER_TOOLS);
    } catch (error) {
      logger.warning("Error adding dev tools:", error);
    }
    // Open the DevTools.
    // rtcWindow.webContents.openDevTools({ activate: true, mode: "detach" });
  }
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

app.whenReady().then((): void => {
  tray = new Tray(appSmallIconPath);
  const contextMenu = Menu.buildFromTemplate([
    { label: "Settings", type: "normal", click: showConfigurationWindow },
    { type: "separator" },
    {
      label: "Close Active Media Player",
      type: "normal",
      click: closePlayerWindow,
    },
    { type: "separator" },
    ...helpMenu,
    { type: "separator" },
    { label: "Quit", type: "normal", click: quitApp },
  ]);
  tray.setToolTip("System Bridge");
  tray.setContextMenu(contextMenu);
  tray.setIgnoreDoubleClickEvents(true);
  tray.on("double-click", showConfigurationWindow);

  api = new API();
});

ipcMain.on(
  "get-app-information",
  async (event): Promise<void> => {
    const settings = getSettings();
    const port: number =
      typeof settings?.network.items?.port?.value === "number"
        ? settings?.network.items?.port?.value
        : 9170;
    const osInfo: Systeminformation.OsData = await si.osInfo();
    const uuidInfo: Systeminformation.UuidData = await si.uuid();
    const defaultInterface: string = await si.networkInterfaceDefault();
    const networkInterface:
      | Systeminformation.NetworkInterfacesData
      | undefined = (await si.networkInterfaces()).find(
      (ni: Systeminformation.NetworkInterfacesData) =>
        ni.iface === defaultInterface
    );

    const data = {
      address: `http://${osInfo.fqdn}:${port}`,
      fqdn: osInfo.fqdn,
      host: osInfo.hostname,
      ip: networkInterface?.ip4,
      mac: networkInterface?.mac,
      port,
      uuid: uuidInfo.os,
      version: app.getVersion(),
    };
    logger.info(`App information: ${JSON.stringify(data)}`);
    event.sender.send("app-information", data);
  }
);

ipcMain.on(
  "open-url",
  async (event, arg): Promise<void> => {
    shell.openExternal(arg);
    event?.sender?.send("opened-url", arg);
  }
);

ipcMain.on(
  "open-settings",
  async (event): Promise<void> => {
    showConfigurationWindow();
    event?.sender?.send("opened-settings");
  }
);

ipcMain.on(
  "get-settings",
  async (event): Promise<void> => {
    event.sender.send("set-settings", getSettings());
  }
);

ipcMain.on(
  "update-setting",
  async (event, args): Promise<void> => {
    logger.debug(`update-setting: ${args[0]}, ${args[1]}`);
    await electronSettings.set(args[0], args[1]);
    await setAppConfig();
    event.sender.send("updated-setting", args);
    ipcMain.emit("updated-setting", args);
  }
);

ipcMain.on(
  "restart-app",
  async (event): Promise<void> => {
    event.sender.send("restarting-app");
    ipcMain.emit("restarting-app");
    logger.debug("restarting-app");
    app.relaunch();
  }
);

ipcMain.on(
  "restart-server",
  async (event): Promise<void> => {
    event.sender.send("restarting-server");
    ipcMain.emit("restarting-server");
    if (api) {
      await api.cleanup();
      api = undefined;
      setTimeout(() => (api = new API()), 2000);
    }
  }
);

ipcMain.on("window-show", (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  window?.show();
});

ipcMain.on("window-hide", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.hide();
});

ipcMain.on("window-minimize", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});

ipcMain.on("window-close", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});

ipcMain.on(
  "log",
  (_event, { message, level }: { message: string; level: string }) => {
    logger.log(level, message);
  }
);

ipcMain.on("get-audio-metadata", async (event, path: string) => {
  const metadata: IAudioMetadata = await parseFile(path);
  const cover = selectCover(metadata.common.picture)?.data.toString("base64");

  event.sender.send("audio-metadata", {
    album: metadata.common.album || "",
    artist: metadata.common.artist || metadata.common.albumartist || "",
    cover: cover && `data:image/png;base64, ${cover}`,
    title: metadata.common.title || "",
  });
});
