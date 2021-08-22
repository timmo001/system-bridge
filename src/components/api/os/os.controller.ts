import { Controller, Get } from "@nestjs/common";

import { Os } from "./entities/os.entity";
import { OsService } from "./os.service";

@Controller("os")
export class OsController {
  constructor(private readonly osService: OsService) {}

  @Get()
  async findAll(): Promise<Os> {
    return await this.osService.findAll();
  }
}
