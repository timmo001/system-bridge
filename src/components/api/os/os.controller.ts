import { Controller, Get, UseGuards } from "@nestjs/common";

import { HttpAuthGuard } from "../httpAuth.guard";
import { Os } from "./entities/os.entity";
import { OsService } from "./os.service";

@Controller("os")
@UseGuards(HttpAuthGuard)
export class OsController {
  constructor(private readonly osService: OsService) {}

  @Get()
  async findAll(): Promise<Os> {
    return await this.osService.findAll();
  }
}
