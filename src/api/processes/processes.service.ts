import { Injectable } from "@nestjs/common";
import si from "systeminformation";

import { Process, Processes } from "./entities/processes.entity";

@Injectable()
export class ProcessesService {
  async findAll(): Promise<Processes> {
    return { ...(await si.processes()), load: await si.currentLoad() };
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
