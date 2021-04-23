import { Injectable } from "@nestjs/common";
import si from "systeminformation";

import { Processes } from "./entities/processes.entity";

@Injectable()
export class ProcessesService {
  async findAll(): Promise<Processes> {
    return { ...(await si.processes()), load: await si.currentLoad() };
  }
}
