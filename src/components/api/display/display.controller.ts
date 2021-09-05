import { Controller, Get, UseGuards } from "@nestjs/common";

import { Display } from "./entities/display.entity";
import { DisplayService } from "./display.service";
import { HttpAuthGuard } from "../httpAuth.guard";

@Controller("display")
@UseGuards(HttpAuthGuard)
export class DisplayController {
  constructor(private readonly displayService: DisplayService) {}

  @Get()
  async findAll(): Promise<Display> {
    return await this.displayService.findAll();
  }
}
