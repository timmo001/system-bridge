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

  async find(): Promise<Data> {
    return {
      audio: "/audio",
      battery: "/battery",
      bluetooth: "/bluetooth",
      cpu: "/cpu",
      filesystem: "/filesystem",
      graphics: "/graphics",
      memory: "/memory",
      network: "/network",
      os: "/os",
      system: "/system",
    };
  }
}
