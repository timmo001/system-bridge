import { Controller, Get, UseGuards } from "@nestjs/common";
import { Systeminformation } from "systeminformation";

import { GraphicsService } from "./graphics.service";
import { HttpAuthGuard } from "../httpAuth.guard";

@Controller("graphics")
@UseGuards(HttpAuthGuard)
export class GraphicsController {
  constructor(private readonly graphicsService: GraphicsService) {}

  @Get()
  async findAll(): Promise<Systeminformation.GraphicsData> {
    return await this.graphicsService.findAll();
  }
}
