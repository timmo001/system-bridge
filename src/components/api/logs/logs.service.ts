import { Injectable } from "@nestjs/common";
// import { readFileSync } from "fs";

// import { Logger, LOG_PATH } from "../../logger";

// const { logger } = new Logger("LogsService");

@Injectable()
export class LogsService {
  async findAll(): Promise<Array<string>> {
    // try {
    //   const data = readFileSync(LOG_PATH, "utf8");
    //   if (data) {
    //     const lines = data.split(/\r\n|\r|\n/g);
    //     return lines;
    //   }
    // } catch (e) {
    //   logger.error(`Error reading logs: ${e.message}`);
    // }
    return [];
  }
}
