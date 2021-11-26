import { Injectable } from "@nestjs/common";
import { currentLoad, processes, Systeminformation } from "systeminformation";

import { Process, Processes } from "./entities/processes.entity";

@Injectable()
export class ProcessesService {
  async findAll(): Promise<Processes> {
    return { ...(await processes()), load: await currentLoad() };
  }

  async findCurrentLoad(): Promise<Systeminformation.CurrentLoadData> {
    return await currentLoad();
  }

  async findProcesses(): Promise<Systeminformation.ProcessesData> {
    return await processes();
  }

  async findProcess(
    name: string,
    exact: boolean
  ): Promise<Process[] | undefined> {
    const data = await this.findProcesses();
    return data.list.filter((process: Process) =>
      exact
        ? process.name.toLowerCase() === name.toLowerCase()
        : process.name.toLowerCase().includes(name.toLowerCase())
    );
  }
}
