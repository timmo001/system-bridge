import { Controller, Get, UseGuards } from "@nestjs/common";

import { HttpAuthGuard } from "../httpAuth.guard";
import { Memory } from "./entities/memory.entity";
import { MemoryService } from "./memory.service";

@Controller("memory")
@UseGuards(HttpAuthGuard)
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  @Get()
  async findAll(): Promise<Memory> {
    return await this.memoryService.findAll();
  }
}
