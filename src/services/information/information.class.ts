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
      audio: { description: "Audio Information", endpoint: "/audio" },
      battery: { description: "Battery Information", endpoint: "/battery" },
      bluetooth: {
        description: "Bluetooth Information",
        endpoint: "/bluetooth",
      },
      command: { description: "Run a System Command", endpoint: "/command" },
      cpu: { description: "CPU Information", endpoint: "/cpu" },
      docs: { description: "OpenAPI Docs", endpoint: "/docs" },
      filesystem: {
        description: "Filesystem Information",
        endpoint: "/filesystem",
      },
      graphics: { description: "Graphics Information", endpoint: "/graphics" },
      information: {
        description: "Endpoint Information (You are Here)",
        endpoint: "/information",
      },
      memory: { description: "Memory Information", endpoint: "/memory" },
      network: { description: "Network Information", endpoint: "/network" },
      os: { description: "OS Information", endpoint: "/os" },
      system: { description: "System Information", endpoint: "/system" },
    };
  }
}
