import { Controller, Get, UseGuards } from "@nestjs/common";
import { Systeminformation } from "systeminformation";

import { BatteryService } from "./battery.service";
import { HttpAuthGuard } from "../httpAuth.guard";

@Controller("battery")
@UseGuards(HttpAuthGuard)
export class BatteryController {
  constructor(private readonly batteryService: BatteryService) {}

  @Get()
  async findAll(): Promise<Systeminformation.BatteryData> {
    return await this.batteryService.findAll();
  }
}
