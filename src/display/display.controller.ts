import { Controller, Get } from "@nestjs/common";

import { Display } from "./entities/display.entity";
import { DisplayService } from "./display.service";

@Controller("display")
export class DisplayController {
  constructor(private readonly displayService: DisplayService) {}

  @Get()
  async findAll(): Promise<Display> {
    return await this.displayService.findAll();
  }
}
