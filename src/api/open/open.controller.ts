import { Body, Controller, Post } from "@nestjs/common";

import { OpenService } from "./open.service";
import { CreateOpenDto } from "./dto/create-open.dto";

@Controller("open")
export class OpenController {
  constructor(private readonly openService: OpenService) {}

  @Post()
  async create(@Body() createOpenDto: CreateOpenDto): Promise<CreateOpenDto> {
    return await this.openService.create(createOpenDto);
  }
}
