import { Injectable } from "@nestjs/common";
import { mem, memLayout, Systeminformation } from "systeminformation";

import { Memory } from "./entities/memory.entity";

@Injectable()
export class MemoryService {
  async findAll(): Promise<Memory> {
    return {
      ...(await this.findMemory()),
      layout: await this.findMemoryLayout(),
    };
  }

  async findMemory(): Promise<Systeminformation.MemData> {
    return await mem();
  }

  async findMemoryLayout(): Promise<Array<Systeminformation.MemLayoutData>> {
    return await memLayout();
  }
}
