import { Injectable } from "@nestjs/common";
import si from "systeminformation";

import { System } from "./entities/system.entity";

@Injectable()
export class SystemService {
  async findAll(): Promise<System> {
    return {
      baseboard: await si.baseboard(),
      bios: await si.bios(),
      chassis: await si.chassis(),
      system: await si.system(),
      uuid: await si.uuid(),
    };
  }
}
