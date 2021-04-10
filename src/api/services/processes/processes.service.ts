// Initializes the `system` service on path `/system`
import { ServiceAddons } from "@feathersjs/feathers";

import { Application } from "../../declarations";
import { Processes } from "./processes.class";
import hooks from "./processes.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    processes: Processes & ServiceAddons<unknown>;
  }
}

export default function (app: Application): void {
  // Initialize our service with any options it requires
  app.use("/processes", new Processes({}, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("processes");

  service.hooks(hooks);
}
