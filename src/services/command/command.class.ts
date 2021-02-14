import execa from "execa";

import { Application } from "../../declarations";
import logger from "../../logger";

interface Data {
  command: string;
  arguments: string[];
  success?: boolean;
  message?: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ServiceOptions {}

export class Command {
  app: Application;
  options: ServiceOptions;

  constructor(options: ServiceOptions = {}, app: Application) {
    this.options = options;
    this.app = app;
  }

  async create(data: Data): Promise<Data> {
    const { stdout, stderr } = await execa(data.command, data.arguments);
    logger.debug({ stdout, stderr });
    return {
      ...data,
      success: stderr ? false : true,
      message: stdout,
    };
  }
}
