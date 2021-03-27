import brightness from "brightness";

import { Application } from "../../declarations";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ServiceOptions {}

export interface DisplayInfo {
  brightness: number;
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
    return {
      brightness: (await brightness.get()) * 100,
    };
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
        else await brightness.set((currentBrightness - 5) / 100);
        break;
      case "brightnessUp":
        if (typeof data.value === "number")
          await brightness.set((currentBrightness + data.value) / 100);
        else await brightness.set((currentBrightness + 5) / 100);
        break;
    }
    return {
      brightness: (await brightness.get()) * 100,
    };
  }
}
