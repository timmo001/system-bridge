import { Injectable } from "@nestjs/common";
import { graphics, Systeminformation } from "systeminformation";

@Injectable()
export class GraphicsService {
  async findAll(): Promise<Systeminformation.GraphicsData> {
    return await graphics();
  }
}
