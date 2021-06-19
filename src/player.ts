import {
  app,
  BrowserWindow,
  BrowserWindowConstructorOptions,
  screen,
} from "electron";
import { join } from "path";
import { copyFile, existsSync, mkdirSync, writeFile, unlink } from "fs";
import queryString from "query-string";

import { appIconPath, getConnection, getSettingsObject } from "./common";
import { MediaCreateData } from "./types/media";
import electronIsDev from "./electronIsDev";
import logger from "./logger";
import { IAudioMetadata, parseFile, selectCover } from "music-metadata";

const isDev = electronIsDev();

let playerWindow: BrowserWindow | undefined;

export interface Source {
  type: "audio" | "video";
  source?: string;
  volumeInitial?: number;
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
  hasCover?: boolean;
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

  // TODO: Implement
  // playerWindow.on("closed", () => {
  //   ipcMain.emit("player-status", undefined);
  // });

  const connection = await getConnection("player");
  const settings = await getSettingsObject(connection);
  connection.close();

  const url = `${
    isDev
      ? "http://localhost:3000/"
      : `file://${join(app.getAppPath(), "frontend/build/index.html")}`
  }?${queryString.stringify({
    ...data,
    id: "player",
    title: "Player",
    apiKey: settings["network-apiKey"],
    apiPort: settings["network-apiPort"] || 9170,
    wsPort: settings["network-wsPort"] || 9172,
  })}`;
  logger.info(`Player URL: ${url}`);

  playerWindow.setVisibleOnAllWorkspaces(true);
  playerWindow.loadURL(url);
  if (data.hidden) playerWindow.hide();
  else playerWindow.show();

  if (isDev) {
    // try {
    //   await devTools(REACT_DEVELOPER_TOOLS);
    // } catch (error) {
    //   logger.warning("Error adding dev tools:", error);
    // }
    // Open the DevTools.
    playerWindow.webContents.openDevTools({ activate: true, mode: "detach" });
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

// export async function getPlayerCover(
//   // sendUpdate?: boolean
// ): Promise<string | undefined> {
//   if (playerWindow && !playerWindow.isDestroyed()) {
//     return new Promise((resolve) => {
//       if (playerWindow && !playerWindow.isDestroyed()) {
//         playerWindow.webContents.send("player-get-cover");
//         logger.debug("player-get-cover");
//         // TODO: Implement
//         // ipcMain.on("player-cover", async (_event, cover: string) => {
//         //   resolve(cover);
//         //   logger.debug(`player-cover: ${cover.substr(0, 30)}..`);
//         //   // let ws: WebSocketConnection;
//         //   if (sendUpdate) {
//         //     const connection = await getConnection();
//         //     const settings = await getSettingsObject(connection);
//         //     await connection.close();

//         //     const ws = new WebSocketConnection(
//         //       Number(settings["network-wsPort"]) || 9172,
//         //       settings["network-apiKey"],
//         //       false,
//         //       async () => {
//         //         ws.sendEvent({ name: "player-cover-ready" });
//         //         await ws.close();
//         //       }
//         //     );
//         //   }
//         // });
//       }
//     });
//   }
//   return undefined;
// }

export async function savePlayerCover(cover?: string): Promise<void> {
  const mediaDir = join(app.getPath("userData"), "public/media");
  if (!existsSync(mediaDir)) mkdirSync(mediaDir);
  if (cover)
    if (cover.startsWith("data:image")) {
      let base64Data = cover.replace(/^data:image\/png;base64,/, "");
      base64Data += base64Data.replace("+", " ");
      writeFile(
        join(mediaDir, "cover.png"),
        Buffer.from(base64Data, "base64").toString("binary"),
        "binary",
        (err) => {
          if (err) logger.error(err.message);
        }
      );
    } else {
      copyFile(cover, join(mediaDir, "cover.png"), (err) => {
        if (err) logger.error(err.message);
      });
    }
  else if (existsSync(join(mediaDir, "cover.png")))
    unlink(join(mediaDir, "cover.png"), (err) => {
      if (err) logger.error(err.message);
    });
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

export async function getAudioMetadata(path: string): Promise<AudioSource> {
  const metadata: IAudioMetadata = await parseFile(path);

  let cover = selectCover(metadata.common.picture)?.data.toString("base64");
  cover = cover && `data:image/png;base64, ${cover}`;
  await savePlayerCover(cover);

  return {
    type: "audio",
    album: metadata.common.album || "",
    artist: metadata.common.artist || metadata.common.albumartist || "",
    title: metadata.common.title || "",
  };
}
