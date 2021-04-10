// Initializes the `system` service on path `/system`
import { ServiceAddons } from "@feathersjs/feathers";

import { Application } from "../../declarations";
import { System } from "./system.class";
import hooks from "./system.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    system: System & ServiceAddons<unknown>;
  }
}

export default function (app: Application): void {
  // Initialize our service with any options it requires
  app.use("/system", new System({}, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("system");

  service.hooks(hooks);
}
