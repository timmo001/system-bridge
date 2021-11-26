import { Controller, Get, UseGuards } from "@nestjs/common";
import { Sensor } from "system-bridge-windows-sensors";
import { Systeminformation } from "systeminformation";

import { CPU } from "./entities/cpu.entity";
import { CpuService } from "./cpu.service";
import { HttpAuthGuard } from "../httpAuth.guard";

@Controller("cpu")
@UseGuards(HttpAuthGuard)
export class CpuController {
  constructor(private readonly cpuService: CpuService) {}

  @Get()
  async findAll(): Promise<CPU> {
    return await this.cpuService.findAll();
  }

  @Get("cache")
  async findCpuCache(): Promise<Systeminformation.CpuCacheData> {
    return await this.cpuService.findCpuCache();
  }

  @Get("cpu")
  async findCpu(): Promise<Systeminformation.CpuData> {
    return await this.cpuService.findCpu();
  }

  @Get("currentSpeed")
  async findCurrentSpeed(): Promise<Systeminformation.CpuCurrentSpeedData> {
    return await this.cpuService.findCurrentSpeed();
  }

  @Get("temperature")
  async findTemperature(): Promise<Systeminformation.CpuTemperatureData> {
    return await this.cpuService.findTemperature();
  }

  @Get("hardware")
  async findHardwareSensors(): Promise<Array<Sensor>> {
    return await this.cpuService.findHardwareSensors();
  }
}
