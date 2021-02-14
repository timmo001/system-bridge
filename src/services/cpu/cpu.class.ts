import si, { Systeminformation } from "systeminformation";

import { Application } from "../../declarations";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ServiceOptions {}

export interface CpuInfo {
  cache: Systeminformation.CpuCacheData;
  cpu: Systeminformation.CpuData;
  currentSpeed: Systeminformation.CpuCurrentSpeedData;
  temperature: Systeminformation.CpuTemperatureData;
}

export class Cpu {
  app: Application;
  options: ServiceOptions;

  constructor(options: ServiceOptions = {}, app: Application) {
    this.options = options;
    this.app = app;
  }

  async find(): Promise<CpuInfo> {
    return {
      cache: await si.cpuCache(),
      cpu: await si.cpu(),
      currentSpeed: await si.cpuCurrentSpeed(),
      temperature: await si.cpuTemperature(),
    };
  }
}
