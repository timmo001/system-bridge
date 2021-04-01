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
    args: any[] | readonly string[] | undefined
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

  async function spawnUpdate(args: any[] | readonly string[] | undefined) {
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

process.on("unhandledRejection", (error: Error) =>
  logger.error("unhandledRejection:", error)
);

process.on("uncaughtException", (error: Error) =>
  logger.error("uncaughtException:", error)
);

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

const setAppConfig = async (): Promise<void> => {
  const config = getSettings();
  const launchOnStartup = config.general?.items.launchOnStartup?.value;
  app.setLoginItemSettings({
    openAtLogin: typeof launchOnStartup === "boolean" ? launchOnStartup : false,
  });
};

let mainWindow: BrowserWindow,
  playerWindow: BrowserWindow | undefined,
  tray: Tray,
  api: API | undefined;
const setupApp = async (): Promise<void> => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    autoHideMenuBar: false,
    icon: appIconPath,
    maximizable: true,
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
      submenu: [
        {
          label: "Close Settings",
          type: "normal",
          click: () => mainWindow.close(),
        },
        { type: "separator" },
        { label: "Quit Application", type: "normal", click: quitApp },
      ],
    },
    ...helpMenu,
  ]);
  Menu.setApplicationMenu(menu);

  if (isDev) {
    try {
      const extName = await devTools(REACT_DEVELOPER_TOOLS);
      logger.debug("Added Extension:", extName);
    } catch (error) {
      logger.error("An error occurred:", error);
    }
  } else {
    updateApp();
  }

  mainWindow.on("close", (event) => {
    event.preventDefault();
    mainWindow.hide();
  });

  try {
    app.dock.hide();
  } catch (e) {
    logger.warn(e);
  }
};

const showConfigurationWindow = async (): Promise<void> => {
  mainWindow.loadURL(
    isDev
      ? "http://localhost:3000"
      : `file://${join(app.getAppPath(), "./configuration/build/index.html")}`
  );

  mainWindow.show();

  if (isDev) {
    // Open the DevTools.
    mainWindow.webContents.openDevTools();
    mainWindow.maximize();
  }
};

export const createPlayerWindow = async (
  data: MediaCreateData
): Promise<void> => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const windowOpts: BrowserWindowConstructorOptions = {
    width: data.type === "audio" ? 460 : 480,
    height: data.type === "audio" ? 130 : 270,
    x: data.x || width - (data.type === "audio" ? 480 : 500),
    y: data.y || height - (data.type === "audio" ? 150 : 290),
    alwaysOnTop: true,
    autoHideMenuBar: true,
    backgroundColor: data.transparent
      ? undefined
      : data.backgroundColor || "#121212",
    frame: false,
    fullscreenable: data.type === "video",
    icon: appIconPath,
    maximizable: false,
    minimizable: true,
    minHeight: 100,
    minWidth: 120,
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

  const url = isDev
    ? `http://localhost:3001/?${queryString.stringify(data)}`
    : `file://${join(
        app.getAppPath(),
        "./player/build/index.html"
      )}?${queryString.stringify(data)}`;

  logger.info(`Player URL: ${url}`);

  playerWindow.loadURL(url);

  if (data.hidden) playerWindow.hide();
  else playerWindow.show();

  if (isDev) {
    try {
      const extName = await devTools(REACT_DEVELOPER_TOOLS);
      logger.debug("Added Extension:", extName);
    } catch (error) {
      logger.error("An error occurred:", error);
    }
    // Open the DevTools.
    playerWindow.webContents.openDevTools({ activate: true, mode: "detach" });
  }
};

export const closePlayerWindow = (): boolean => {
  if (playerWindow) {
    if (!playerWindow.isDestroyed()) {
      playerWindow.close();
    }
    playerWindow = undefined;
    return true;
  }
  return false;
};

export const pausePlayerWindow = (): boolean => {
  if (playerWindow && !playerWindow.isDestroyed()) {
    logger.debug("player-pause");
    playerWindow.webContents.send("player-pause");
    return true;
  }
  return false;
};
export const playPlayerWindow = (): boolean => {
  if (playerWindow && !playerWindow.isDestroyed()) {
    logger.debug("player-play");
    playerWindow.webContents.send("player-play");
    return true;
  }
  return false;
};
export const playpausePlayerWindow = (): boolean => {
  if (playerWindow && !playerWindow.isDestroyed()) {
    logger.debug("player-playpause");
    playerWindow.webContents.send("player-playpause");
    return true;
  }
  return false;
};

const quitApp = (): void => {
  tray?.destroy();
  mainWindow?.destroy();
  app.quit();
};

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

ipcMain.on("window-minimize", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});

ipcMain.on("window-close", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});

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
