import {
  app,
  BrowserWindow,
  BrowserWindowConstructorOptions,
  ipcMain,
  screen,
} from "electron";
import { join } from "path";
import queryString from "query-string";

import { appIconPath, wsSendEvent } from "./common";
import { MediaCreateData } from "./types/media";
import electronIsDev from "./electronIsDev";
import logger from "./logger";

const isDev = electronIsDev();

let playerWindow: BrowserWindow | undefined;

export interface Source {
  type: "audio" | "video";
  source?: string;
  volumeInitial: number;
}

export interface AudioSource extends Source {
  type: "audio";
  album: string;
  artist: string;
  cover?: string;
  title: string;
}

export interface VideoSource extends Source {
  type: "video";
}

export interface PlayerStatus {
  duration?: number;
  muted?: boolean;
  playing?: boolean;
  position?: number;
  source?: AudioSource | VideoSource;
  volume?: number;
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
      // devTools: isDev,
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

  playerWindow.webContents.on("will-redirect", (event: Event) =>
    event.preventDefault()
  );

  playerWindow.on("closed", () => {
    ipcMain.emit("player-status", undefined);
  });

  const url = `${
    isDev
      ? "http://localhost:3000/"
      : `file://${join(app.getAppPath(), "frontend/build/index.html")}`
  }?${queryString.stringify({
    ...data,
    id: "player",
    title: "Player",
  })}`;
  logger.info(`Player URL: ${url}`);

  playerWindow.setVisibleOnAllWorkspaces(true);
  playerWindow.loadURL(url);
  if (data.hidden) playerWindow.hide();
  else playerWindow.show();

  // if (isDev) {
  //   // try {
  //   //   await devTools(REACT_DEVELOPER_TOOLS);
  //   // } catch (error) {
  //   //   logger.warning("Error adding dev tools:", error);
  //   // }
  //   // Open the DevTools.
  //   playerWindow.webContents.openDevTools({ activate: true, mode: "detach" });
  // }
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

export function mutePlayerWindow(value: boolean): boolean {
  if (playerWindow && !playerWindow.isDestroyed()) {
    logger.debug(`player-mute: ${value}`);
    playerWindow.webContents.send("player-mute", value);
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

export function seekPlayerWindow(value: number): boolean {
  if (playerWindow && !playerWindow.isDestroyed()) {
    logger.debug("player-seek");
    playerWindow.webContents.send("player-seek", value);
    return true;
  }
  return false;
}

export async function getPlayerCover(): Promise<string | undefined> {
  if (playerWindow && !playerWindow.isDestroyed()) {
    return new Promise((resolve) => {
      if (playerWindow && !playerWindow.isDestroyed()) {
        playerWindow.webContents.send("player-get-cover");
        logger.debug("player-get-cover");
        ipcMain.removeAllListeners("player-cover");
        ipcMain.on("player-cover", async (_event, cover: string) => {
          logger.debug("player-cover");
          resolve(cover);
          await wsSendEvent({ name: "player-cover", data: cover });
        });
      }
    });
  }
  return undefined;
}

export function volumePlayerWindow(
  value: number,
  type?: "down" | "up"
): boolean {
  if (playerWindow && !playerWindow.isDestroyed()) {
    value /= 100;
    if (type === "down") {
      logger.debug(`player-volume-down: ${value}`);
      playerWindow.webContents.send("player-volume-down", value);
    } else if (type === "up") {
      logger.debug(`player-volume-up: ${value}`);
      playerWindow.webContents.send("player-volume-up", value);
    } else {
      logger.debug(`player-volume: ${value}`);
      playerWindow.webContents.send("player-volume", value);
    }
    return true;
  }
  return false;
}
