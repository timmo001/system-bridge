import execa from "execa";

import { Application } from "../../declarations";
import logger from "../../../logger";

interface Data {
  command: string;
  arguments: string[];
  wait?: boolean;
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
    if (data.wait) {
      const { stdout, stderr } = await execa(data.command, data.arguments);
      logger.info(JSON.stringify({ stdout, stderr }));
      return {
        ...data,
        success: stderr ? false : true,
        message: stdout,
      };
    }
    execa(data.command, data.arguments)
      .then((stdout) => logger.info(JSON.stringify({ stdout })))
      .catch((stderr) => logger.warn(JSON.stringify({ stderr })));
    return data;
  }
}
