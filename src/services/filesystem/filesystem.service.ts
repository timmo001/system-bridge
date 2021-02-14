// Initializes the `system` service on path `/system`
import { ServiceAddons } from "@feathersjs/feathers";

import { Application } from "../../declarations";
import { Filesystem } from "./filesystem.class";
import hooks from "./filesystem.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    filesystem: Filesystem & ServiceAddons<unknown>;
  }
}

export default function (app: Application): void {
  // Initialize our service with any options it requires
  app.use("/filesystem", new Filesystem({}, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("filesystem");

  service.hooks(hooks);
}
