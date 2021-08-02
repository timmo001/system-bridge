import { Controller, Get } from "@nestjs/common";

import { InformationService } from "./information.service";
import { Information } from "./entities/information.entity";

@Controller("information")
export class InformationController {
  constructor(private readonly appService: InformationService) {}

  @Get()
  async findAll(): Promise<Information> {
    return await this.appService.findAll();
  }
}
