import { Injectable } from "@nestjs/common";
import { osInfo, users } from "systeminformation";

import { Os } from "./entities/os.entity";
import { Logger } from "../../logger";

const logger = new Logger("OsService");

@Injectable()
export class OsService {
  async findAll(): Promise<Os> {
    let idleTime = -1;
    try {
      const { getIdleTime } = await import("desktop-idle");
      idleTime = getIdleTime();
    } catch (e) {
      logger.error(`Error ${e.message}`);
    }
    return {
      ...(await osInfo()),
      idleTime,
      users: await users(),
    };
  }
}
