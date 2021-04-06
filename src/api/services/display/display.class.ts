import { screen } from "electron";
import brightness from "brightness";

import { Application } from "../../declarations";
import logger from "../../../logger";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ServiceOptions {}

export interface DisplayInfo {
  brightness: number;
  displays: Electron.Display[];
}

export type DisplayUpdateId = "brightness" | "brightnessDown" | "brightnessUp";

export interface DisplayUpdateData {
  value?: boolean | number;
}

export class Display {
  app: Application;
  options: ServiceOptions;

  constructor(options: ServiceOptions = {}, app: Application) {
    this.options = options;
    this.app = app;
  }

  async find(): Promise<DisplayInfo> {
    try {
      return {
        brightness: Math.round((await brightness.get()) * 100),
        displays: screen.getAllDisplays(),
      };
    } catch (e) {
      logger.info(`Couldnt get brightness. ${e.message}`);
      return {
        brightness: -1,
        displays: screen.getAllDisplays(),
      };
    }
  }

  async update(
    id: DisplayUpdateId,
    data: DisplayUpdateData
  ): Promise<DisplayInfo> {
    const currentBrightness: number = (await brightness.get()) * 100;
    switch (id) {
      default:
        break;
      case "brightness":
        if (typeof data.value === "number")
          await brightness.set(data.value / 100);
        break;
      case "brightnessDown":
        if (typeof data.value === "number")
          await brightness.set((currentBrightness - data.value) / 100);
        break;
      case "brightnessUp":
        if (typeof data.value === "number")
          await brightness.set((currentBrightness + data.value) / 100);
        break;
    }
    return await this.find();
  }
}
