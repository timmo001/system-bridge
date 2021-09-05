import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";

import { CommandService } from "./command.service";
import { CreateCommandDto } from "./dto/create-command.dto";
import { HttpAuthGuard } from "../httpAuth.guard";

@Controller("command")
@UseGuards(HttpAuthGuard)
export class CommandController {
  constructor(private readonly commandService: CommandService) {}

  @Post()
  async create(
    @Body() createCommandDto: CreateCommandDto
  ): Promise<CreateCommandDto> {
    if (process.env.SB_CLI === "true")
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
