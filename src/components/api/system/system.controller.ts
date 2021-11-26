import { Controller, Get, UseGuards } from "@nestjs/common";
import { Systeminformation } from "systeminformation";

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

  @Get("baseboard")
  async findBaseboard(): Promise<Systeminformation.BaseboardData> {
    return await this.systemService.findBaseboard();
  }

  @Get("bios")
  async findBios(): Promise<Systeminformation.BiosData> {
    return await this.systemService.findBios();
  }

  @Get("chassis")
  async findChassis(): Promise<Systeminformation.ChassisData> {
    return await this.systemService.findChassis();
  }

  @Get("system")
  async findSystem(): Promise<Systeminformation.SystemData> {
    return await this.systemService.findSystem();
  }

  @Get("uuid")
  async findUuid(): Promise<Systeminformation.UuidData> {
    return this.systemService.findUuid();
  }
}
