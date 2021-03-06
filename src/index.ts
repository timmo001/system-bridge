import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  MenuItemConstructorOptions,
  shell,
  Tray,
} from "electron";
import { join } from "path";
import devTools, { REACT_DEVELOPER_TOOLS } from "electron-devtools-installer";
import electronSettings from "electron-settings";
import isDev from "electron-is-dev";
import updateApp from "update-electron-app";

import { getSettings } from "./utils";
import API from "./api";
import logger from "./logger";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  // eslint-disable-line global-require
  app.quit();
}

export const appIconPath = join(
  app.getAppPath(),
  "./public/system-bridge-circle.png"
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
        click: () => shell.openPath(join(app.getAppPath(), "./logs/app.log")),
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

let mainWindow: BrowserWindow, tray: Tray, api: API | undefined;
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
};

const showWindow = async (): Promise<void> => {
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
  tray = new Tray(appIconPath);
  const contextMenu = Menu.buildFromTemplate([
    { label: "Settings", type: "normal", click: showWindow },
    { type: "separator" },
    ...helpMenu,
    { type: "separator" },
    { label: "Quit", type: "normal", click: quitApp },
  ]);
  tray.setToolTip("System Bridge");
  tray.setContextMenu(contextMenu);
  tray.setIgnoreDoubleClickEvents(true);
  tray.on("double-click", showWindow);

  api = new API();
});

ipcMain.on(
  "open-settings",
  async (event): Promise<void> => {
    showWindow();
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
