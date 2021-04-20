import { Injectable } from "@nestjs/common";
import si from "systeminformation";

import { Os } from "./entities/os.entity";

@Injectable()
export class OsService {
  async findAll(): Promise<Os> {
    return {
      ...(await si.osInfo()),
      users: await si.users(),
    };
  }
}
