import { Injectable } from "@nestjs/common";
import { readFileSync } from "fs";

import { logsPath } from "../../common";
import logger from "../../logger";

@Injectable()
export class LogsService {
  async findAll(): Promise<Array<string>> {
    try {
      const data = readFileSync(logsPath, "utf8");
      if (data) {
        const lines = data.split(/\r\n|\r|\n/g);
        return lines;
      }
    } catch (e) {
      logger.error(`LogsService - Error reading logs: ${e.message}`);
    }
    return [];
  }
}
