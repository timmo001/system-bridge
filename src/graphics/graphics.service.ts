import { Hardware } from "system-bridge-windows-sensors";
import { Injectable } from "@nestjs/common";

import { Graphics } from "./entities/graphics.entity";
import { graphics } from "systeminformation";
import logger from "../logger";

@Injectable()
export class GraphicsService {
  async findAll(): Promise<Graphics> {
    const data: Graphics = {
      ...(await graphics()),
    };

    if (process.platform === "win32") {
      try {
        const { getHardwareByType } = await import(
          "system-bridge-windows-sensors"
        );

        const hardware: Hardware = (await getHardwareByType(
          "Gpu",
          !process.argv0.includes("node.exe"),
          false,
          false
        )) as Hardware;

        console.log("hardware:", typeof hardware, hardware);

        if (hardware.sensors) {
          data.hardwareSensors = hardware.sensors;
        }
      } catch (e) {
        logger.error(e.message);
      }
    }
    return data;
  }
}
