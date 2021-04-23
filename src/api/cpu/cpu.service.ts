import { Injectable } from "@nestjs/common";
import si from "systeminformation";

import { CPU } from "./entities/cpu.entity";

@Injectable()
export class CpuService {
  async findAll(): Promise<CPU> {
    return {
      cache: await si.cpuCache(),
      cpu: await si.cpu(),
      currentSpeed: await si.cpuCurrentSpeed(),
      temperature: await si.cpuTemperature(),
    };
  }
}
