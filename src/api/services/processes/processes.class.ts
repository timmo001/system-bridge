import si, { Systeminformation } from "systeminformation";

import { Application } from "../../declarations";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ServiceOptions {}

export interface ProcessesInfo extends Systeminformation.ProcessesData {
  load: Systeminformation.CurrentLoadData;
}

export class Processes {
  app: Application;
  options: ServiceOptions;

  constructor(options: ServiceOptions = {}, app: Application) {
    this.options = options;
    this.app = app;
  }

  async find(): Promise<ProcessesInfo> {
    return { ...(await si.processes()), load: await si.currentLoad() };
  }
}
