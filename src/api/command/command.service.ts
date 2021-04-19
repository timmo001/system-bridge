import { Injectable } from "@nestjs/common";
import execa from "execa";

import { CreateCommandDto } from "./dto/create-command.dto";
import logger from "../../logger";

@Injectable()
export class CommandService {
  async create(createCommandDto: CreateCommandDto): Promise<CreateCommandDto> {
    if (createCommandDto.wait) {
      const { stdout, stderr } = await execa(
        createCommandDto.command,
        createCommandDto.arguments
      );
      logger.info(JSON.stringify({ stdout, stderr }));
      return {
        ...createCommandDto,
        success: stderr ? false : true,
        message: stdout,
      };
    }
    execa(createCommandDto.command, createCommandDto.arguments)
      .then((stdout) => logger.info(JSON.stringify({ stdout })))
      .catch((stderr) => logger.warn(JSON.stringify({ stderr })));
    return createCommandDto;
  }
}
