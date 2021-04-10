import { app } from "electron";
import { BadRequest } from "@feathersjs/errors";
import { resolve } from "path";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import express from "@feathersjs/express";
import fs from "fs";
import loudness from "loudness";
import si, { Systeminformation } from "systeminformation";

import { Application } from "../../declarations";
import {
  closePlayerWindow,
  createPlayerWindow,
  pausePlayerWindow,
  playpausePlayerWindow,
  playPlayerWindow,
} from "../../../player";
import { MediaCreateData } from "../../../types/media";
import logger from "../../../logger";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ServiceOptions {}

export interface AudioInfo {
  current: { muted: boolean; volume: number };
  devices: Systeminformation.AudioData[];
}

export type AudioUpdateId =
  | "mute"
  | "pause"
  | "play"
  | "playpause"
  | "stop"
  | "volume"
  | "volumeDown"
  | "volumeUp";

interface AudioDeleteResponse {
  successful: boolean;
}

export interface AudioUpdateData {
  value?: boolean | number;
}

export class Audio {
  app: Application;
  options: ServiceOptions;

  constructor(options: ServiceOptions = {}, app: Application) {
    this.options = options;
    this.app = app;
  }

  async create(data: MediaCreateData): Promise<MediaCreateData> {
    if (!data.path && !data.url)
      throw new BadRequest("You must provide a path or url");

    const url = `/audio-${uuidv4()}`;

    if (data.path) {
      logger.info(`Path: ${data.path}`);

      if (
        !(await new Promise<boolean>((resolve) => {
          if (data.path)
            fs.access(data.path, (err: NodeJS.ErrnoException | null) =>
              resolve(err ? false : true)
            );
        }))
      )
        throw new BadRequest("Path provided does not exist");
    }

    (async () => {
      closePlayerWindow();
      if (data.url) {
        data.path = app.getPath("temp") + url;
        logger.info(`Downloading: ${data.url}`);
        const response = await axios.get(data.url, {
          responseType: "stream",
        });
        const writer = fs.createWriteStream(data.path);
        response.data.pipe(writer);
        await new Promise((resolve, reject) => {
          writer.on("finish", resolve);
          writer.on("error", reject);
        });
      }

      if (data.path) {
        logger.info(`URL: ${url}`);
        this.app.use(url, express.static(resolve(data.path)));

        createPlayerWindow({ ...data, type: "audio", url });
      }
    })();

    return { ...data, type: "audio", url };
  }

  async remove(): Promise<AudioDeleteResponse> {
    return { successful: closePlayerWindow() };
  }

  async find(): Promise<AudioInfo> {
    let current = {
      muted: false,
      volume: -1,
    };
    try {
      current = {
        muted: await loudness.getMuted(),
        volume: await loudness.getVolume(),
      };
    } catch (e) {
      logger.info(`Cannot get audio from loudness module: ${e.message}`);
    }
    return {
      current,
      devices: await si.audio(),
    };
  }

  async update(
    id: AudioUpdateId,
    data: AudioUpdateData
  ): Promise<AudioInfo | AudioDeleteResponse> {
    const currentVolume: number = await loudness.getVolume();
    switch (id) {
      default:
        break;
      case "mute":
        if (typeof data.value === "boolean")
          await loudness.setMuted(data.value);
        break;
      case "pause":
        return { successful: pausePlayerWindow() };
      case "play":
        return { successful: playPlayerWindow() };
      case "playpause":
        return { successful: playpausePlayerWindow() };
      case "stop":
        return { successful: closePlayerWindow() };
      case "volume":
        if (typeof data.value === "number")
          await loudness.setVolume(data.value);
        break;
      case "volumeDown":
        if (typeof data.value === "number")
          await loudness.setVolume(currentVolume - data.value);
        else await loudness.setVolume(currentVolume - 5);
        break;
      case "volumeUp":
        if (typeof data.value === "number")
          await loudness.setVolume(currentVolume + data.value);
        else await loudness.setVolume(currentVolume + 5);
        break;
    }
    return {
      current: {
        muted: await loudness.getMuted(),
        volume: await loudness.getVolume(),
      },
      devices: await si.audio(),
    };
  }
}
