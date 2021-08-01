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
      let hardwareSensors = [];
      try {
        const { getHardwareByType } = await import(
          "system-bridge-windows-sensors"
        );

        hardwareSensors = (
          await getHardwareByType("Cpu", !process.argv0.includes("node.exe"))
        ).sensors;
      } catch (e) {
        logger.error(e.message);
      }

      if (hardwareSensors) {
        data.hardwareSensors = hardwareSensors;

        if (!data.cpu.voltage)
          data.cpu.voltage = String(
            hardwareSensors.find(
              (sensor) =>
                sensor.type === "Voltage" && sensor.name.startsWith("Core #")
            ).value
          );

        if (!data.temperature.main)
          data.temperature.main = Number(
            hardwareSensors.find((sensor) => sensor.type === "Temperature")
              .value
          );

        if (
          !data.currentSpeed.avg ||
          data.currentSpeed.min === data.currentSpeed.max
        ) {
          const clocks: Array<number> = [];
          for (const sensor of hardwareSensors) {
            if (sensor.type === "Clock" && typeof sensor.value === "number")
              clocks.push(sensor.value);
          }
          if (clocks.length > 0) {
            data.currentSpeed.avg =
              Math.round(
                (clocks.reduce((a, b) => a + b, 0) / clocks.length) * 100
              ) / 100;
            data.currentSpeed.min = Math.round(Math.min(...clocks) * 100) / 100;
            data.currentSpeed.max = Math.round(Math.max(...clocks) * 100) / 100;
            data.currentSpeed.cores = clocks.map(
              (c: number) => Math.round(c * 100) / 100
            );
          }
        }
      }
    }
    return data;
  }
}
