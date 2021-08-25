import { Injectable } from "@nestjs/common";
import {
  cpu,
  cpuCache,
  cpuCurrentSpeed,
  cpuTemperature,
} from "systeminformation";
import { Hardware, Sensor } from "system-bridge-windows-sensors";

import { CPU } from "./entities/cpu.entity";
import { Logger } from "../../logger";

const { logger } = new Logger("CpuService");

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

        const hardware = (await getHardwareByType(
          "Cpu",
          !process.argv0.includes("node.exe"),
          true,
          true,
          { cpu: true }
        )) as Array<Hardware>;

        if (hardware && hardware.length > 0) {
          data.hardwareSensors = [];
          for (const hw of hardware)
            data.hardwareSensors = [...data.hardwareSensors, ...hw.sensors];

          if (!data.cpu.voltage)
            data.cpu.voltage = String(
              Math.round(
                Number(
                  hardware[0].sensors.find(
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
                  hardware[0].sensors.find(
                    (sensor: Sensor) => sensor.type === "Temperature"
                  ).value
                ) * 100
              ) / 100;

          if (
            !data.currentSpeed.avg ||
            data.currentSpeed.min === data.currentSpeed.max
          ) {
            const clocks: Array<number> = [];
            for (const sensor of hardware[0].sensors) {
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
        logger.error(`Error: ${e.message}`);
      }
    }
    return data;
  }
}
