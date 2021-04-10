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
      audio: {
        description: "Play audio, change volume, and get information",
        endpoint: "/audio",
        supportedMethods: ["DELETE", "GET", "POST", "PUT"],
      },
      battery: {
        description: "Battery Information",
        endpoint: "/battery",
        supportedMethods: ["GET"],
      },
      bluetooth: {
        description: "Bluetooth Information",
        endpoint: "/bluetooth",
        supportedMethods: ["GET"],
      },
      command: {
        description: "Run a System Command",
        endpoint: "/command",
        supportedMethods: ["POST"],
      },
      cpu: {
        description: "CPU Information",
        endpoint: "/cpu",
        supportedMethods: ["GET"],
      },
      display: {
        description: "Control and get display information",
        endpoint: "/display",
        supportedMethods: ["GET", "PUT"],
      },
      docs: {
        description: "OpenAPI Docs",
        endpoint: "/docs",
        supportedMethods: ["GET"],
      },
      filesystem: {
        description: "Filesystem Information",
        endpoint: "/filesystem",
        supportedMethods: ["GET"],
      },
      graphics: {
        description: "Graphics Information",
        endpoint: "/graphics",
        supportedMethods: ["GET"],
      },
      information: {
        description: "Endpoint Information (You are Here)",
        endpoint: "/information",
        supportedMethods: ["GET"],
      },
      memory: {
        description: "Memory Information",
        endpoint: "/memory",
        supportedMethods: ["GET"],
      },
      network: {
        description: "Network Information",
        endpoint: "/network",
        supportedMethods: ["GET"],
      },
      notification: {
        description: "Create a system notification",
        endpoint: "/notification",
        supportedMethods: ["POST"],
      },
      open: {
        description: "Open a URL or file using the default application",
        endpoint: "/open",
        supportedMethods: ["POST"],
      },
      os: {
        description: "OS Information",
        endpoint: "/os",
        supportedMethods: ["GET"],
      },
      processes: {
        description: "Processes Information",
        endpoint: "/processes",
        supportedMethods: ["GET"],
      },
      system: {
        description: "System Information",
        endpoint: "/system",
        supportedMethods: ["GET"],
      },
      video: {
        description: "Play videos and control playback",
        endpoint: "/video",
        supportedMethods: ["DELETE", "POST", "PUT"],
      },
    };
  }
}
