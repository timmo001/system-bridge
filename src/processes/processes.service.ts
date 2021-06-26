import { Injectable } from "@nestjs/common";
import { currentLoad, processes } from "systeminformation";

import { Process, Processes } from "./entities/processes.entity";

@Injectable()
export class ProcessesService {
  async findAll(): Promise<Processes> {
    return { ...(await processes()), load: await currentLoad() };
  }

  async find(name: string, exact: boolean): Promise<Process[] | undefined> {
    const data = await this.findAll();
    return data.list.filter((process: Process) =>
      exact
        ? process.name.toLowerCase() === name.toLowerCase()
        : process.name.toLowerCase().includes(name.toLowerCase())
    );
  }
}
