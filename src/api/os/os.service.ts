import { Injectable } from "@nestjs/common";
import desktopIdle from "desktop-idle";
import si from "systeminformation";

import { Os } from "./entities/os.entity";

@Injectable()
export class OsService {
  async findAll(): Promise<Os> {
    return {
      ...(await si.osInfo()),
      idleTime: desktopIdle.getIdleTime(),
      users: await si.users(),
    };
  }
}
