// Initializes the `system` service on path `/system`
import { ServiceAddons } from "@feathersjs/feathers";

import { Application } from "../../declarations";
import { Battery } from "./battery.class";
import hooks from "./battery.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    battery: Battery & ServiceAddons<unknown>;
  }
}

export default function (app: Application): void {
  // Initialize our service with any options it requires
  app.use("/battery", new Battery({}, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("battery");

  service.hooks(hooks);
}
