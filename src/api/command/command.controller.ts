import { Body, Controller, Post } from "@nestjs/common";

import { CommandService } from "./command.service";
import { CreateCommandDto } from "./dto/create-command.dto";

@Controller("command")
export class CommandController {
  constructor(private readonly commandService: CommandService) {}

  @Post()
  async create(
    @Body() createCommandDto: CreateCommandDto
  ): Promise<CreateCommandDto> {
    return await this.commandService.create(createCommandDto);
  }
}
