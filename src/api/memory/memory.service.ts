import { Injectable } from "@nestjs/common";
import si from "systeminformation";

import { Memory } from "./entities/memory.entity";

@Injectable()
export class MemoryService {
  async findAll(): Promise<Memory> {
    return {
      ...(await si.mem()),
      layout: await si.memLayout(),
    };
  }
}
