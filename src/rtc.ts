import { app, BrowserWindow, BrowserWindowConstructorOptions } from "electron";
import { join } from "path";
import queryString from "query-string";

import { appIconPath } from "./common";
import electronIsDev from "./electronIsDev";
import logger from "./logger";

const isDev = electronIsDev();

let rtcWindow: BrowserWindow | undefined;

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
      // devTools: isDev,
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
  });

  // if (isDev) {
  //   try {
  //     await devTools(REACT_DEVELOPER_TOOLS);
  //   } catch (error) {
  //     logger.warning("Error adding dev tools:", error);
  //   }
  //   // Open the DevTools.
  //   // rtcWindow.webContents.openDevTools({ activate: true, mode: "detach" });
  // }
}

export function closeRTCWindow(): boolean {
  if (rtcWindow) {
    if (!rtcWindow.isDestroyed()) {
      rtcWindow.close();
    }
    rtcWindow = undefined;
    return true;
  }
  return false;
}
