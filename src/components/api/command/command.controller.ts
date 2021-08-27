import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
} from "@nestjs/common";

import { CommandService } from "./command.service";
import { CreateCommandDto } from "./dto/create-command.dto";

@Controller("command")
export class CommandController {
  constructor(private readonly commandService: CommandService) {}

  @Post()
  async create(
    @Body() createCommandDto: CreateCommandDto
  ): Promise<CreateCommandDto> {
    if (process.env.CLI_ONLY === "true")
      throw new HttpException(
        {
          status: HttpStatus.NOT_IMPLEMENTED,
          error: "This feature is not supported in cli only mode.",
        },
        HttpStatus.NOT_IMPLEMENTED
      );

    return await this.commandService.create(createCommandDto);
  }
}
