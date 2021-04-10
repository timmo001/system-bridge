import si, { Systeminformation } from "systeminformation";

import { Application } from "../../declarations";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ServiceOptions {}

export interface MemoryInfo extends Systeminformation.MemData {
  layout: Systeminformation.MemLayoutData[];
}

export class Memory {
  app: Application;
  options: ServiceOptions;

  constructor(options: ServiceOptions = {}, app: Application) {
    this.options = options;
    this.app = app;
  }

  async find(): Promise<MemoryInfo> {
    return {
      ...(await si.mem()),
      layout: await si.memLayout(),
    };
  }
}
