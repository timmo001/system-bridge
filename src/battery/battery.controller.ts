import { Controller, Get } from "@nestjs/common";
import { Systeminformation } from "systeminformation";

import { BatteryService } from "./battery.service";

@Controller("battery")
export class BatteryController {
  constructor(private readonly batteryService: BatteryService) {}

  @Get()
  async findAll(): Promise<Systeminformation.BatteryData> {
    return await this.batteryService.findAll();
  }
}
