import si, { Systeminformation } from "systeminformation";
import loudness from "loudness";

import { Application } from "../../declarations";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ServiceOptions {}

export interface AudioInfo {
  current: { muted: boolean; volume: number };
  devices: Systeminformation.AudioData[];
}

export type AudioUpdateId = "mute" | "volume" | "volumeDown" | "volumeUp";

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
