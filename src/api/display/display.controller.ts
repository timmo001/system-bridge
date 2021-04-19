import { Body, Controller, Get, Param, Put } from "@nestjs/common";

import { Display } from "./entities/display.entity";
import { DisplayService } from "./display.service";
import { UpdateDisplayDto, UpdateDisplayId } from "./dto/update-display.dto";

@Controller("display")
export class DisplayController {
  constructor(private readonly displayService: DisplayService) {}

  @Get()
  async findAll(): Promise<Display> {
    return await this.displayService.findAll();
  }

  @Put(":id")
  async update(
    @Param("id") id: UpdateDisplayId,
    @Body() updateDisplayDto: UpdateDisplayDto
  ): Promise<Display> {
    return await this.displayService.update(id, updateDisplayDto);
  }
}
