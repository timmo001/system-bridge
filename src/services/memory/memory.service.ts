// Initializes the `system` service on path `/system`
import { ServiceAddons } from "@feathersjs/feathers";

import { Application } from "../../declarations";
import { Memory } from "./memory.class";
import hooks from "./memory.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    memory: Memory & ServiceAddons<unknown>;
  }
}

export default function (app: Application): void {
  // Initialize our service with any options it requires
  app.use("/memory", new Memory({}, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("memory");

  service.hooks(hooks);
}
