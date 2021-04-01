// import { app } from "electron";
import { BadRequest } from "@feathersjs/errors";
import { resolve } from "path";
import { v4 as uuidv4 } from "uuid";
// import axios from "axios";
import express from "@feathersjs/express";
// import fs from "fs";

import { Application } from "../../declarations";
import {
  createPlayerWindow,
  closePlayerWindow,
  pausePlayerWindow,
  playPlayerWindow,
  playpausePlayerWindow,
} from "../../index";
import logger from "../../logger";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ServiceOptions {}

export type VideoUpdateId = "pause" | "play" | "playpause" | "stop";

export interface VideoCreateData {
  backgroundColor?: string;
  hidden?: boolean;
  opacity?: number;
  path?: string;
  transparent?: boolean;
  url?: string;
  volume?: number;
  x?: number;
  y?: number;
}

interface VideoResponse {
  successful: boolean;
}

export class Video {
  app: Application;
  options: ServiceOptions;

  constructor(options: ServiceOptions = {}, app: Application) {
    this.options = options;
    this.app = app;
  }

  async create(data: VideoCreateData): Promise<VideoCreateData> {
    if (!data.path && !data.url)
      throw new BadRequest("You must provide a path or url.");

    const url = `/video-${uuidv4()}`;

    (async () => {
      closePlayerWindow();
      //   if (data.url) {
      //     data.path = app.getPath("temp") + url;
      //     logger.info(`Downloading: ${data.url}`);
      //     const response = await axios.get(data.url, {
      //       responseType: "stream",
      //     });
      //     const writer = fs.createWriteStream(data.path);
      //     response.data.pipe(writer);
      //     await new Promise((resolve, reject) => {
      //       writer.on("finish", resolve);
      //       writer.on("error", reject);
      //     });
      //   }

      if (data.path) {
        logger.info(`Path: ${data.path}`);
        logger.info(`URL: ${url}`);
        this.app.use(url, express.static(resolve(data.path)));
        createPlayerWindow({ ...data, type: "video", url });
      } else if (data.url) {
        createPlayerWindow({ ...data, type: "video", url: data.url });
      }
    })();

    return { ...data, url };
  }

  async remove(): Promise<VideoResponse> {
    return { successful: closePlayerWindow() };
  }

  async update(id: VideoUpdateId): Promise<VideoResponse> {
    switch (id) {
      default:
        break;
      case "pause":
        return { successful: pausePlayerWindow() };
      case "play":
        return { successful: playPlayerWindow() };
      case "playpause":
        return { successful: playpausePlayerWindow() };
      case "stop":
        return { successful: closePlayerWindow() };
    }
    return {
      successful: false,
    };
  }
}
