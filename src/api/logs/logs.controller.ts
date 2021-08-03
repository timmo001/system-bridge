import { Controller, Get } from "@nestjs/common";

import { LogsService } from "./logs.service";

@Controller("logs")
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  async findAll(): Promise<string> {
    return await this.logsService.findAll();
  }
}
