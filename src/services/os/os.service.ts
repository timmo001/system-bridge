// Initializes the `system` service on path `/system`
import { ServiceAddons } from "@feathersjs/feathers";

import { Application } from "../../declarations";
import { Os } from "./os.class";
import hooks from "./os.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    os: Os & ServiceAddons<unknown>;
  }
}

export default function (app: Application): void {
  // Initialize our service with any options it requires
  app.use("/os", new Os({}, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("os");

  service.hooks(hooks);
}
