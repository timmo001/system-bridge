import { dirname } from "path";
import { graphics, Systeminformation } from "systeminformation";
import { Hardware, Sensor } from "system-bridge-windows-sensors";
import { Injectable } from "@nestjs/common";

import { Graphics } from "./entities/graphics.entity";
import { Logger } from "../../logger";

@Injectable()
export class GraphicsService {
  async findAll(): Promise<Graphics> {
    const data: Graphics = {
      ...(await this.findGraphics()),
      ...(await this.findHardwareSensors()),
    };

    return data;
  }

  async findGraphics(): Promise<Systeminformation.GraphicsData> {
    return await graphics();
  }

  async findHardwareSensors(): Promise<Array<Sensor> | null> {
    if (process.platform === "win32") {
      try {
        const { getHardwareByType } = await import(
          "system-bridge-windows-sensors"
        );

        const hardware = (await getHardwareByType(
          "Gpu",
          process.env.SB_PACKAGED === "false"
            ? undefined
            : dirname(process.execPath),
          false,
          true,
          { gpu: true }
        )) as Array<Hardware>;

        if (hardware && hardware.length > 0) {
          let hardwareSensors = [];
          for (const hw of hardware)
            hardwareSensors = [...hardwareSensors, ...hw.sensors];
        }
      } catch (e) {
        const { logger } = new Logger("GraphicsService");
        logger.error(`Error: ${e.message}`);
        logger.close();
      }
    }
    return null;
  }
}
