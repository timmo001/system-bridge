import { Body, Controller, Post } from "@nestjs/common";

import { KeyboardService } from "./keyboard.service";
import { CreateKeyboardDto } from "./dto/create-keyboard.dto";

@Controller("keyboard")
export class KeyboardController {
  constructor(private readonly keyboardService: KeyboardService) {}

  @Post()
  async create(
    @Body() createKeyboardDto: CreateKeyboardDto
  ): Promise<CreateKeyboardDto> {
    return await this.keyboardService.create(createKeyboardDto);
  }
}
