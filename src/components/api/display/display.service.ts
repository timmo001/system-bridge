import { Injectable } from "@nestjs/common";

import { Display } from "./entities/display.entity";
import { GraphicsService } from "../graphics/graphics.service";

@Injectable()
export class DisplayService {
  async findAll(): Promise<Display> {
    const graphics = await new GraphicsService().findGraphics();
    return { displays: graphics.displays };
  }
}
