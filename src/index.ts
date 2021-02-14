import { app, BrowserWindow, ipcMain, Menu, Tray } from "electron";
import { join } from "path";
import electronSettings from "electron-settings";
import isDev from "electron-is-dev";
import devTools, { REACT_DEVELOPER_TOOLS } from "electron-devtools-installer";

import { getSettings } from "./utils";
import API from "./api";

const iconPath = "../src/resources/icons/icon.png";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  // eslint-disable-line global-require
  app.quit();
}

let mainWindow: BrowserWindow, tray: Tray;
const createWindow = async (): Promise<void> => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    autoHideMenuBar: true,
    icon: join(__dirname, iconPath),
    maximizable: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      preload: join(__dirname, "./preload.js"),
    },
  });

  if (isDev) {
    try {
      const extName = await devTools(REACT_DEVELOPER_TOOLS);
      console.log("Added Extension:", extName);
    } catch (error) {
      console.log("An error occurred:", error);
    }
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
      : `file://${join(__dirname, "../configuration/build/index.html")}`
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
app.on("ready", createWindow);

app.on("activate", (): void => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then((): void => {
  tray = new Tray(join(__dirname, iconPath));
  const contextMenu = Menu.buildFromTemplate([
    { label: "Settings", type: "normal", click: showWindow },
    { type: "separator" },
    { label: "Quit", type: "normal", click: quitApp },
  ]);
  tray.setToolTip("System Bridge");
  tray.setContextMenu(contextMenu);
  tray.setIgnoreDoubleClickEvents(true);
  tray.on("double-click", showWindow);

  new API();
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
  async (_event, args): Promise<void> => {
    await electronSettings.set(args[0], args[1]);
    ipcMain.emit("updated-setting", args);
  }
);
