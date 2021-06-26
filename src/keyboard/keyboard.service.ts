import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import robot from "robotjs";

import { CreateKeyboardDto } from "./dto/create-keyboard.dto";

@Injectable()
export class KeyboardService {
  async create(
    createKeyboardDto: CreateKeyboardDto
  ): Promise<CreateKeyboardDto> {
    try {
      robot.keyTap(createKeyboardDto.key);
      return createKeyboardDto;
    } catch (e) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: e.message,
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }
}
