import { Controller, Get, UseGuards } from "@nestjs/common";
import { HttpAuthGuard } from "../httpAuth.guard";

import { CpuService } from "./cpu.service";
import { CPU } from "./entities/cpu.entity";

@Controller("cpu")
@UseGuards(HttpAuthGuard)
export class CpuController {
  constructor(private readonly cpuService: CpuService) {}

  @Get()
  async findAll(): Promise<CPU> {
    return await this.cpuService.findAll();
  }
}
