// Initializes the `system` service on path `/system`
import { ServiceAddons } from "@feathersjs/feathers";

import { Application } from "../../declarations";
import { Display } from "./display.class";
import hooks from "./display.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    display: Display & ServiceAddons<unknown>;
  }
}

export default function (app: Application): void {
  // Initialize our service with any options it requires
  app.use("/display", new Display({}, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("display");

  service.hooks(hooks);
}
