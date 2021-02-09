import si, { Systeminformation } from "systeminformation";

export interface CpuInfo {
  cache: Systeminformation.CpuCacheData;
  cpu: Systeminformation.CpuData;
  currentSpeed: Systeminformation.CpuCurrentSpeedData;
  temperature: Systeminformation.CpuTemperatureData;
}

export default class CpuInfoService {
  async find(): Promise<CpuInfo> {
    return {
      cache: await si.cpuCache(),
      cpu: await si.cpu(),
      currentSpeed: await si.cpuCurrentSpeed(),
      temperature: await si.cpuTemperature(),
    };
  }
}
