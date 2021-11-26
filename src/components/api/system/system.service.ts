import { Injectable } from "@nestjs/common";
import {
  baseboard,
  bios,
  chassis,
  system,
  Systeminformation,
  uuid,
} from "systeminformation";

import { System } from "./entities/system.entity";

@Injectable()
export class SystemService {
  async findAll(): Promise<System> {
    return {
      baseboard: await this.findBaseboard(),
      bios: await this.findBios(),
      chassis: await this.findChassis(),
      system: await this.findSystem(),
      uuid: await this.findUuid(),
    };
  }

  async findBaseboard(): Promise<Systeminformation.BaseboardData> {
    return await baseboard();
  }

  async findBios(): Promise<Systeminformation.BiosData> {
    return await bios();
  }

  async findChassis(): Promise<Systeminformation.ChassisData> {
    return await chassis();
  }

  async findSystem(): Promise<Systeminformation.SystemData> {
    return await system();
  }

  async findUuid(): Promise<Systeminformation.UuidData> {
    return await uuid();
  }
}
