import { Injectable } from "@nestjs/common";
import si, { Systeminformation } from "systeminformation";

@Injectable()
export class GraphicsService {
  async findAll(): Promise<Systeminformation.GraphicsData> {
    return await si.graphics();
  }
}
