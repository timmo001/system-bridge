import { Injectable } from "@nestjs/common";
import si, { Systeminformation } from "systeminformation";

@Injectable()
export class BatteryService {
  async findAll(): Promise<Systeminformation.BatteryData> {
    return await si.battery();
  }
}
