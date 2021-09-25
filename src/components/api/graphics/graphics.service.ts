import { dirname } from "path";
import { Hardware } from "system-bridge-windows-sensors";
import { Injectable } from "@nestjs/common";

import { Graphics } from "./entities/graphics.entity";
import { graphics } from "systeminformation";
import { Logger } from "../../logger";

@Injectable()
export class GraphicsService {
  async findAll(): Promise<Graphics> {
    const { logger } = new Logger("GraphicsService");

    const data: Graphics = {
      ...(await graphics()),
    };

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
          data.hardwareSensors = [];
          for (const hw of hardware)
            data.hardwareSensors = [...data.hardwareSensors, ...hw.sensors];
        }
      } catch (e) {
        logger.error(`Error: ${e.message}`);
      }
      logger.close();
    }
    return data;
  }
}
