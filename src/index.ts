import { app, BrowserWindow, ipcMain, Menu, Tray } from "electron";
import { join } from "path";
import electronSettings from "electron-settings";

import { getSettings } from "./utils";
import icon from "./resources/icons/icon.png";
import Main from "./main";

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  // eslint-disable-line global-require
  app.quit();
}

let mainWindow: BrowserWindow;
const createWindow = (): void => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    autoHideMenuBar: true,
    icon: join(__dirname, icon),
    maximizable: true,
    webPreferences: {
      contextIsolation: true,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
    mainWindow.maximize();
  }

  mainWindow.on("close", (event) => {
    event.preventDefault();
    mainWindow.hide();
  });

  const appIcon = new Tray(join(__dirname, icon));
  const contextMenu = Menu.buildFromTemplate([
    { label: "Settings", type: "normal", click: () => mainWindow.show() },
    { type: "separator" },
    {
      label: "Quit",
      type: "normal",
      click: () => {
        mainWindow.destroy();
        app.quit();
      },
    },
  ]);
  appIcon.setToolTip("System Bridge");
  appIcon.setContextMenu(contextMenu);
  appIcon.on("double-click", () => mainWindow.show());

  new Main();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on("get-settings", async (event) => {
  event.sender.send("set-settings", getSettings());
});

ipcMain.on("update-setting", async (_event, args) => {
  await electronSettings.set(args[0], args[1]);
  ipcMain.emit("updated-setting", args);
});
