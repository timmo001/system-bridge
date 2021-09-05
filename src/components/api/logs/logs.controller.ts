import { Controller, Get, UseGuards } from "@nestjs/common";

import { HttpAuthGuard } from "../httpAuth.guard";
import { LogsService } from "./logs.service";

@Controller("logs")
@UseGuards(HttpAuthGuard)
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  async findAll(): Promise<Array<string>> {
    return await this.logsService.findAll();
  }
}
