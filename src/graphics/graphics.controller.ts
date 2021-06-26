import { Controller, Get } from "@nestjs/common";
import { Systeminformation } from "systeminformation";

import { GraphicsService } from "./graphics.service";

@Controller("graphics")
export class GraphicsController {
  constructor(private readonly graphicsService: GraphicsService) {}

  @Get()
  async findAll(): Promise<Systeminformation.GraphicsData> {
    return await this.graphicsService.findAll();
  }
}
