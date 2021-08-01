import { Injectable } from "@nestjs/common";
import {
  cpu,
  cpuCache,
  cpuCurrentSpeed,
  cpuTemperature,
} from "systeminformation";

import { CPU } from "./entities/cpu.entity";
import logger from "../logger";

@Injectable()
export class CpuService {
  async findAll(): Promise<CPU> {
    const data: CPU = {
      cache: await cpuCache(),
      cpu: await cpu(),
      currentSpeed: await cpuCurrentSpeed(),
      temperature: await cpuTemperature(),
    };

    if (process.platform === "win32") {
      let sensors = [];
      try {
        const { getHardwareByType } = await import(
          "system-bridge-windows-sensors"
        );

        sensors = (await getHardwareByType("Cpu", !__filename.includes("node")))
          .sensors;
      } catch (e) {
        logger.error(e.message);
      }

      if (sensors) {
        data.sensors = sensors;

        if (!data.cpu.voltage)
          data.cpu.voltage = String(
            sensors.find(
              (sensor) =>
                sensor.type === "Voltage" && sensor.name.startsWith("Core #")
            ).value
          );

        if (!data.temperature.main)
          data.temperature.main = Number(
            sensors.find((sensor) => sensor.type === "Temperature").value
          );

        if (
          !data.currentSpeed.avg ||
          data.currentSpeed.min === data.currentSpeed.max
        ) {
          const clocks: Array<number> = [];
          for (const sensor of sensors) {
            if (sensor.type === "Clock" && typeof sensor.value === "number")
              clocks.push(sensor.value);
          }
          if (clocks.length > 0) {
            data.currentSpeed.avg =
              clocks.reduce((a, b) => a + b, 0) / clocks.length;
            data.currentSpeed.min = Math.min(...clocks);
            data.currentSpeed.max = Math.max(...clocks);
            data.currentSpeed.cores = clocks;
          }
        }
      }
    }
    return data;
  }
}
