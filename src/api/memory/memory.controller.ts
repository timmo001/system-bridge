import { Controller, Get } from "@nestjs/common";

import { Memory } from "./entities/memory.entity";
import { MemoryService } from "./memory.service";

@Controller("memory")
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  @Get()
  async findAll(): Promise<Memory> {
    return await this.memoryService.findAll();
  }
}
