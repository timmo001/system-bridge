import { Injectable } from "@nestjs/common";
import {
  cpu,
  cpuCache,
  cpuCurrentSpeed,
  cpuTemperature,
} from "systeminformation";
import { Hardware, Sensor } from "system-bridge-windows-sensors";

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
      try {
        const { getHardwareByType } = await import(
          "system-bridge-windows-sensors"
        );

        const hardware: Hardware = (await getHardwareByType(
          "Cpu",
          !process.argv0.includes("node.exe"),
          true,
          false
        )) as Hardware;

        if (hardware.sensors) {
          data.hardwareSensors = hardware.sensors;

          if (!data.cpu.voltage)
            data.cpu.voltage = String(
              Math.round(
                Number(
                  hardware.sensors.find(
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
                  hardware.sensors.find(
                    (sensor: Sensor) => sensor.type === "Temperature"
                  ).value
                ) * 100
              ) / 100;

          if (
            !data.currentSpeed.avg ||
            data.currentSpeed.min === data.currentSpeed.max
          ) {
            const clocks: Array<number> = [];
            for (const sensor of hardware.sensors) {
              if (
                sensor.type === "Clock" &&
                !sensor.name.includes("Bus") &&
                typeof sensor.value === "number"
              )
                clocks.push(sensor.value);
            }
            if (clocks.length > 0) {
              data.currentSpeed.avg =
                Math.round(
                  (clocks.reduce((a, b) => a + b, 0) / clocks.length) * 100
                ) / 100;
              data.currentSpeed.min =
                Math.round(Math.min(...clocks) * 100) / 100;
              data.currentSpeed.max =
                Math.round(Math.max(...clocks) * 100) / 100;
              data.currentSpeed.cores = clocks.map(
                (c: number) => Math.round(c * 100) / 100
              );
            }
          }
        }
      } catch (e) {
        logger.error(e.message);
      }
    }
    return data;
  }
}
