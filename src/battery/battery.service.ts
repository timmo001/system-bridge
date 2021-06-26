import { Injectable } from "@nestjs/common";
import { battery, Systeminformation } from "systeminformation";

@Injectable()
export class BatteryService {
  async findAll(): Promise<Systeminformation.BatteryData> {
    return await battery();
  }
}
