import si, { Systeminformation } from "systeminformation";

export interface CpuInfo {
  cpu: Systeminformation.CpuData;
  currentSpeed: Systeminformation.CpuCurrentSpeedData;
  temperature: Systeminformation.CpuTemperatureData;
}

export default class CpuInfoService {
  async find(): Promise<CpuInfo> {
    return {
      cpu: await si.cpu(),
      currentSpeed: await si.cpuCurrentSpeed(),
      temperature: await si.cpuTemperature(),
    };
  }
}
