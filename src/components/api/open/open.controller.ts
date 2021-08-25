import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
} from "@nestjs/common";

import { OpenService } from "./open.service";
import { CreateOpenDto } from "./dto/create-open.dto";

@Controller("open")
export class OpenController {
  constructor(private readonly openService: OpenService) {}

  @Post()
  async create(@Body() createOpenDto: CreateOpenDto): Promise<CreateOpenDto> {
    if (process.env.CLI_ONLY === "true")
      throw new HttpException(
        {
          status: HttpStatus.NOT_IMPLEMENTED,
          error: "This feature is not supported in cli only mode.",
        },
        HttpStatus.NOT_IMPLEMENTED
      );

    return await this.openService.create(createOpenDto);
  }
}
