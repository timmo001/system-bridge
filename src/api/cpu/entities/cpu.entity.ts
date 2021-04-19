import { Systeminformation } from "systeminformation";

export interface CPU {
  cache: Systeminformation.CpuCacheData;
  cpu: Systeminformation.CpuData;
  currentSpeed: Systeminformation.CpuCurrentSpeedData;
  temperature: Systeminformation.CpuTemperatureData;
}
