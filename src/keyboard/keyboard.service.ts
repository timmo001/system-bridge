import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import robot from "robotjs";

import { CreateKeyboardDto } from "./dto/create-keyboard.dto";

@Injectable()
export class KeyboardService {
  async create(
    createKeyboardDto: CreateKeyboardDto
  ): Promise<CreateKeyboardDto> {
    try {
      if (createKeyboardDto.key && createKeyboardDto.text)
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error:
              "Invalid combination of properties. Please specify either 'key' or 'text'",
          },
          HttpStatus.BAD_REQUEST
        );
      else if (createKeyboardDto.key)
        if (createKeyboardDto.modifiers?.length > 0)
          robot.keyTap(createKeyboardDto.key, createKeyboardDto.modifiers);
        else robot.keyTap(createKeyboardDto.key);
      else if (createKeyboardDto.text) robot.typeString(createKeyboardDto.text);
      else
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error:
              "No property specified. Please specify either 'key' or 'text'",
          },
          HttpStatus.BAD_REQUEST
        );

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
