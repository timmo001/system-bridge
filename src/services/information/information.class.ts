import { Params } from "@feathersjs/feathers";
import { Application } from "../../declarations";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Data {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ServiceOptions {}

export class Information {
  app: Application;
  options: ServiceOptions;

  constructor(options: ServiceOptions = {}, app: Application) {
    this.options = options;
    this.app = app;
  }

  async find(params: Params): Promise<Data> {
    return {
      audio: `${params.route}/audio`,
      battery: `${params.route}/battery`,
      bluetooth: `${params.route}/bluetooth`,
      cpu: `${params.route}/cpu`,
      filesystem: `${params.route}/filesystem`,
      graphics: `${params.route}/graphics`,
      memory: `${params.route}/memory`,
      network: `${params.route}/network`,
      os: `${params.route}/os`,
      system: `${params.route}/system`,
    };
  }
}
