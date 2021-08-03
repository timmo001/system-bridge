import { Injectable } from "@nestjs/common";
import { readFileSync } from "fs";

import { logsPath } from "../../logger";

@Injectable()
export class LogsService {
  async findAll(): Promise<Array<string>> {
    const data = readFileSync(logsPath, "utf8");
    const lines = data.split("\r\n");
    return lines;
  }
}
