import { Controller, Get } from "@nestjs/common";

import { CpuService } from "./cpu.service";
import { CPU } from "./entities/cpu.entity";

@Controller("cpu")
export class CpuController {
  constructor(private readonly cpuService: CpuService) {}

  @Get()
  async findAll(): Promise<CPU> {
    return await this.cpuService.findAll();
  }
}
