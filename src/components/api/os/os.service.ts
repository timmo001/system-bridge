import { Injectable } from "@nestjs/common";
import { osInfo, users } from "systeminformation";

import { Os } from "./entities/os.entity";

@Injectable()
export class OsService {
  async findAll(): Promise<Os> {
    return {
      ...(await osInfo()),
      users: await users(),
    };
  }
}
