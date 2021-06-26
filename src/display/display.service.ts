import { Injectable } from "@nestjs/common";
import Brightness from "brightness";

import { Display } from "./entities/display.entity";
import { GraphicsService } from "../graphics/graphics.service";
import { UpdateDisplayDto, UpdateDisplayId } from "./dto/update-display.dto";
import logger from "../logger";

@Injectable()
export class DisplayService {
  async findAll(): Promise<Display> {
    let brightness = -1;
    try {
      brightness = Math.round((await Brightness.get()) * 100);
    } catch (e) {
      logger.info(`Couldnt get brightness. ${e.message}`);
    }
    const graphics = await new GraphicsService().findAll();
    return { brightness, displays: graphics.displays };
  }

  async update(
    id: UpdateDisplayId,
    updateDisplayDto: UpdateDisplayDto
  ): Promise<Display> {
    try {
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
            await Brightness.set(
              (currentBrightness - updateDisplayDto.value) / 100
            );
          break;
        case "brightnessUp":
          if (typeof updateDisplayDto.value === "number")
            await Brightness.set(
              (currentBrightness + updateDisplayDto.value) / 100
            );
          break;
      }
    } catch (e) {
      logger.warn(`Error updating brightness. ${e.message}`);
    }
    return await this.findAll();
  }
}
