import { Controller, Get } from "@nestjs/common";

import { Processes } from "./entities/processes.entity";
import { ProcessesService } from "./processes.service";

@Controller("processes")
export class ProcessesController {
  constructor(private readonly processesService: ProcessesService) {}

  @Get()
  async findAll(): Promise<Processes> {
    return await this.processesService.findAll();
  }
}
