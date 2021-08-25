import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
} from "@nestjs/common";

import { KeyboardService } from "./keyboard.service";
import { CreateKeyboardDto } from "./dto/create-keyboard.dto";

@Controller("keyboard")
export class KeyboardController {
  constructor(private readonly keyboardService: KeyboardService) {}

  @Post()
  async create(
    @Body() createKeyboardDto: CreateKeyboardDto
  ): Promise<CreateKeyboardDto> {
    if (process.env.CLI_ONLY === "true")
      throw new HttpException(
        {
          status: HttpStatus.NOT_IMPLEMENTED,
          error: "This feature is not supported in cli only mode.",
        },
        HttpStatus.NOT_IMPLEMENTED
      );

    return await this.keyboardService.create(createKeyboardDto);
  }
}
