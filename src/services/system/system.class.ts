import { Id, Params } from "@feathersjs/feathers";
import si from "systeminformation";

import { Application } from "../../declarations";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Data {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ServiceOptions {}

export class System {
  app: Application;
  options: ServiceOptions;

  constructor(options: ServiceOptions = {}, app: Application) {
    this.options = options;
    this.app = app;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async get(type: Id, _params?: Params): Promise<Data> {
    switch (type) {
      default:
        return {};
      case "system":
        return {
          baseboard: await si.baseboard(),
          bios: await si.bios(),
          chassis: await si.chassis(),
          system: await si.system(),
          uuid: await si.uuid(),
        };
    }
  }
}
