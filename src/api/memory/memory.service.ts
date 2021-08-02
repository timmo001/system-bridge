import { Injectable } from "@nestjs/common";
import { mem, memLayout } from "systeminformation";

import { Memory } from "./entities/memory.entity";

@Injectable()
export class MemoryService {
  async findAll(): Promise<Memory> {
    return {
      ...(await mem()),
      layout: await memLayout(),
    };
  }
}
