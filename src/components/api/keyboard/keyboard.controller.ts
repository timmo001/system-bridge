import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";

import { CreateKeyboardDto } from "./dto/create-keyboard.dto";
import { HttpAuthGuard } from "../httpAuth.guard";
import { KeyboardService } from "./keyboard.service";

@Controller("keyboard")
@UseGuards(HttpAuthGuard)
export class KeyboardController {
  constructor(private readonly keyboardService: KeyboardService) {}

  @Post()
  async create(
    @Body() createKeyboardDto: CreateKeyboardDto
  ): Promise<CreateKeyboardDto> {
    if (process.env.SB_CLI === "true")
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
