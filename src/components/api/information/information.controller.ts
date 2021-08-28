import { Controller, Get, UseGuards } from "@nestjs/common";

import { HttpAuthGuard } from "../httpAuth.guard";
import { Information } from "./entities/information.entity";
import { InformationService } from "./information.service";

@Controller("information")
@UseGuards(HttpAuthGuard)
export class InformationController {
  constructor(private readonly appService: InformationService) {}

  @Get()
  async findAll(): Promise<Information> {
    return await this.appService.findAll();
  }
}
