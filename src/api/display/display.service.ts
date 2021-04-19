import { Injectable } from "@nestjs/common";
import { screen } from "electron";
import Brightness from "brightness";

import { Display } from "./entities/display.entity";
import logger from "../../logger";
import { UpdateDisplayDto, UpdateDisplayId } from "./dto/update-display.dto";

@Injectable()
export class DisplayService {
  async findAll(): Promise<Display> {
    let brightness = -1,
      displays;
    try {
      brightness = Math.round((await Brightness.get()) * 100);
    } catch (e) {
      logger.info(`Couldnt get brightness. ${e.message}`);
    }
    try {
      displays = screen?.getAllDisplays();
    } catch (e) {
      logger.info(`Couldnt get screen. ${e.message}`);
    }
    return { brightness, displays: displays || [] };
  }

  async update(
    id: UpdateDisplayId,
    updateDisplayDto: UpdateDisplayDto
  ): Promise<Display> {
    const currentBrightness: number = (await Brightness.get()) * 100;
    switch (id) {
      default:
        break;
      case "brightness":
        if (typeof updateDisplayDto.value === "number")
          await Brightness.set(updateDisplayDto.value / 100);
        break;
      case "brightnessDown":
        if (typeof updateDisplayDto.value === "number")
          await Brightness.set((currentBrightness - data.value) / 100);
        break;
      case "brightnessUp":
        if (typeof updateDisplayDto.value === "number")
          await Brightness.set(
            (currentBrightness + updateDisplayDto.value) / 100
          );
        break;
    }
    return await this.findAll();
  }
}
