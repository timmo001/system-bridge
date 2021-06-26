import { Injectable } from "@nestjs/common";
import { baseboard, bios, chassis, system, uuid } from "systeminformation";

import { System } from "./entities/system.entity";

@Injectable()
export class SystemService {
  async findAll(): Promise<System> {
    return {
      baseboard: await baseboard(),
      bios: await bios(),
      chassis: await chassis(),
      system: await system(),
      uuid: await uuid(),
    };
  }
}
