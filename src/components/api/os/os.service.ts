import { Injectable } from "@nestjs/common";
import { osInfo, Systeminformation, users } from "systeminformation";

import { Os } from "./entities/os.entity";

@Injectable()
export class OsService {
  async findAll(): Promise<Os> {
    return {
      ...(await this.findOsInfo()),
      users: await this.findUsers(),
    };
  }

  async findOsInfo(): Promise<Systeminformation.OsData> {
    return await osInfo();
  }

  async findUsers(): Promise<Array<Systeminformation.UserData>> {
    return await users();
  }
}
