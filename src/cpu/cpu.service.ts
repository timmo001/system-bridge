import { Injectable } from "@nestjs/common";
import {
  cpu,
  cpuCache,
  cpuCurrentSpeed,
  cpuTemperature,
} from "systeminformation";

import { CPU } from "./entities/cpu.entity";

@Injectable()
export class CpuService {
  async findAll(): Promise<CPU> {
    return {
      cache: await cpuCache(),
      cpu: await cpu(),
      currentSpeed: await cpuCurrentSpeed(),
      temperature: await cpuTemperature(),
    };
  }
}
