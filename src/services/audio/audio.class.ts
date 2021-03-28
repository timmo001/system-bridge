import { resolve } from "path";
import { v4 as uuidv4 } from "uuid";
import { IAudioMetadata, ICommonTagsResult, parseFile } from "music-metadata";
import express from "@feathersjs/express";
import loudness from "loudness";
import si, { Systeminformation } from "systeminformation";

import { Application } from "../../declarations";
import { createPlayerWindow } from "../../index";
import logger from "../../logger";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ServiceOptions {}

export interface AudioInfo {
  current: { muted: boolean; volume: number };
  devices: Systeminformation.AudioData[];
}

export type AudioUpdateId = "mute" | "volume" | "volumeDown" | "volumeUp";

interface AudioCreateData {
  path: string;
}

interface AudioCreateDataResult extends AudioCreateData {
  metadata: ICommonTagsResult;
  url: string;
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

  async create(data: AudioCreateData): Promise<AudioCreateDataResult> {
    const url = `/audio-${uuidv4()}`;
    logger.info(`url: ${url}`);
    this.app.use(url, express.static(resolve(data.path)));

    const metadata: IAudioMetadata = await parseFile(data.path);

    createPlayerWindow(
      metadata.common.artist || metadata.common.albumartist || "",
      metadata.common.album || "",
      metadata.common.title || "",
      url
    );
    return { ...data, metadata: metadata.common, url };
  }

  async find(): Promise<AudioInfo> {
    return {
      current: {
        muted: await loudness.getMuted(),
        volume: await loudness.getVolume(),
      },
      devices: await si.audio(),
    };
  }

  async update(id: AudioUpdateId, data: AudioUpdateData): Promise<AudioInfo> {
    const currentVolume: number = await loudness.getVolume();
    switch (id) {
      default:
        break;
      case "mute":
        if (typeof data.value === "boolean")
          await loudness.setMuted(data.value);
        break;
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
