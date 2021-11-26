import { dirname } from "path";
import { Injectable } from "@nestjs/common";
import {
  cpu,
  cpuCache,
  cpuCurrentSpeed,
  cpuTemperature,
  Systeminformation,
} from "systeminformation";
import { Hardware, Sensor } from "system-bridge-windows-sensors";

import { CPU } from "./entities/cpu.entity";
import { Logger } from "../../logger";

const { logger } = new Logger("CpuService");

@Injectable()
export class CpuService {
  async findAll(): Promise<CPU> {
    const data: CPU = {
      cache: await this.findCpuCache(),
      cpu: await this.findCpu(),
      currentSpeed: await this.findCurrentSpeed(),
      temperature: await this.findTemperature(),
    };

    if (process.platform === "win32") {
      try {
        data.hardwareSensors = await this.findHardwareSensors();

        if (!data.cpu.voltage)
          data.cpu.voltage = String(
            Math.round(
              Number(
                data.hardwareSensors.find(
                  (sensor: Sensor) =>
                    sensor.type === "Voltage" &&
                    sensor.name.startsWith("Core #")
                ).value
              ) * 100
            ) / 100
          );

        if (!data.temperature.main)
          data.temperature.main =
            Math.round(
              Number(
                data.hardwareSensors.find(
                  (sensor: Sensor) => sensor.type === "Temperature"
                ).value
              ) * 100
            ) / 100;

        if (
          !data.currentSpeed.avg ||
          data.currentSpeed.min === data.currentSpeed.max
        ) {
          const clocks: Array<number> = [];
          for (const sensor of data.hardwareSensors) {
            if (
              sensor.type === "Clock" &&
              !sensor.name.includes("Bus") &&
              typeof sensor.value === "number"
            )
              clocks.push(sensor.value / 1000);
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
      } catch (e) {
        logger.error(`Error: ${e.message}`);
      }
    }
    return data;
  }

  async findCpuCache(): Promise<Systeminformation.CpuCacheData> {
    return await cpuCache();
  }

  async findCpu(): Promise<Systeminformation.CpuData> {
    return await cpu();
  }

  async findCurrentSpeed(): Promise<Systeminformation.CpuCurrentSpeedData> {
    return await cpuCurrentSpeed();
  }

  async findTemperature(): Promise<Systeminformation.CpuTemperatureData> {
    return await cpuTemperature();
  }

  async findHardwareSensors(): Promise<Array<Sensor> | null> {
    if (process.platform === "win32") {
      const { getHardwareByType } = await import(
        "system-bridge-windows-sensors"
      );

      const hardware = (await getHardwareByType(
        "Cpu",
        process.env.SB_PACKAGED === "false"
          ? undefined
          : dirname(process.execPath),
        true,
        true,
        { cpu: true }
      )) as Array<Hardware>;

      let hardwareSensors = [];
      if (hardware && hardware.length > 0) {
        for (const hw of hardware)
          hardwareSensors = [...hardwareSensors, ...hw.sensors];
      }
      return hardwareSensors;
    }
    return null;
  }
}
