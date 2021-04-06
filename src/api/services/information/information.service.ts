// Initializes the `system` service on path `/system`
import { ServiceAddons } from "@feathersjs/feathers";

import { Application } from "../../declarations";
import { Information } from "./information.class";
import hooks from "./information.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    information: Information & ServiceAddons<unknown>;
  }
}

export default function (app: Application): void {
  // Initialize our service with any options it requires
  app.use("/information", new Information({}, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("information");

  service.hooks(hooks);
}
