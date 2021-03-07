// Initializes the service
import { ServiceAddons } from "@feathersjs/feathers";

import { Application } from "../../declarations";
import { Open } from "./open.class";
import hooks from "./open.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    open: Open & ServiceAddons<unknown>;
  }
}

export default function (app: Application): void {
  // Initialize our service with any options it requires
  app.use("/open", new Open({}, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("open");

  service.hooks(hooks);
}
