import si, { Systeminformation } from "systeminformation";

import { Application } from "../../declarations";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ServiceOptions {}

export interface SystemInfo {
  baseboard: Systeminformation.BaseboardData;
  bios: Systeminformation.BiosData;
  chassis: Systeminformation.ChassisData;
  system: Systeminformation.SystemData;
  uuid: Systeminformation.UuidData;
}

export class System {
  app: Application;
  options: ServiceOptions;

  constructor(options: ServiceOptions = {}, app: Application) {
    this.options = options;
    this.app = app;
  }

  async find(): Promise<SystemInfo> {
    return {
      baseboard: await si.baseboard(),
      bios: await si.bios(),
      chassis: await si.chassis(),
      system: await si.system(),
      uuid: await si.uuid(),
    };
  }
}
