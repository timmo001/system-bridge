import { Injectable } from "@nestjs/common";
import { readFileSync } from "fs";

import { logsPath } from "../../logger";

@Injectable()
export class LogsService {
  async findAll(): Promise<string> {
    return readFileSync(logsPath, "utf8");
  }
}
