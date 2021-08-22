import { Injectable } from "@nestjs/common";
import { osInfo, users } from "systeminformation";

import { Os } from "./entities/os.entity";
import logger from "../../logger";

@Injectable()
export class OsService {
  async findAll(): Promise<Os> {
    let idleTime = -1;
    try {
      const { getIdleTime } = await import("desktop-idle");
      idleTime = getIdleTime();
    } catch (e) {
      logger.error(`OsService - Error ${e.message}`);
    }
    return {
      ...(await osInfo()),
      idleTime,
      users: await users(),
    };
  }
}
