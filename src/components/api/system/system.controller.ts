import { Controller, Get, UseGuards } from "@nestjs/common";

import { HttpAuthGuard } from "../httpAuth.guard";
import { System } from "./entities/system.entity";
import { SystemService } from "./system.service";

@Controller("system")
@UseGuards(HttpAuthGuard)
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get()
  async findAll(): Promise<System> {
    return await this.systemService.findAll();
  }
}
