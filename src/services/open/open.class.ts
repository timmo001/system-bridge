import { shell } from "electron";

import { Application } from "../../declarations";

interface Data {
  path: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ServiceOptions {}

export class Open {
  app: Application;
  options: ServiceOptions;

  constructor(options: ServiceOptions = {}, app: Application) {
    this.options = options;
    this.app = app;
  }

  async create(data: Data): Promise<Data> {
    shell.beep();
    if (data.path.includes("://")) shell.openExternal(data.path);
    else shell.openPath(data.path);
    return data;
  }
}
