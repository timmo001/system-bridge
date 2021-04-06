// Initializes the `system` service on path `/system`
import { ServiceAddons } from "@feathersjs/feathers";

import { Application } from "../../declarations";
import { Graphics } from "./graphics.class";
import hooks from "./graphics.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    graphics: Graphics & ServiceAddons<unknown>;
  }
}

export default function (app: Application): void {
  // Initialize our service with any options it requires
  app.use("/graphics", new Graphics({}, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("graphics");

  service.hooks(hooks);
}
