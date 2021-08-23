import { Injectable } from "@nestjs/common";
import execa, { ExecaReturnValue } from "execa";

import { CreateCommandDto } from "./dto/create-command.dto";
import { Logger } from "../../logger";

const { logger } = new Logger("CommandService");

@Injectable()
export class CommandService {
  async create(createCommandDto: CreateCommandDto): Promise<CreateCommandDto> {
    if (createCommandDto.wait) {
      const { stdout, stderr } = await execa(
        createCommandDto.command,
        createCommandDto.arguments
      );
      logger.debug(JSON.stringify({ stdout, stderr }));
      return {
        ...createCommandDto,
        success: stderr ? false : true,
        message: stdout,
        error: stderr || undefined,
      };
    }
    execa(createCommandDto.command, createCommandDto.arguments)
      .then((stdout: ExecaReturnValue<string>) => logger.info(stdout))
      .catch((stderr: ExecaReturnValue<string>) => logger.warn(stderr));
    return createCommandDto;
  }
}
