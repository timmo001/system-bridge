import si, { Systeminformation } from "systeminformation";

import { Application } from "../../declarations";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ServiceOptions {}

export interface OsInfo extends Systeminformation.OsData {
  users: Systeminformation.UserData[];
}

export class Os {
  app: Application;
  options: ServiceOptions;

  constructor(options: ServiceOptions = {}, app: Application) {
    this.options = options;
    this.app = app;
  }

  async find(): Promise<OsInfo> {
    return {
      ...(await si.osInfo()),
      users: await si.users(),
    };
  }
}
