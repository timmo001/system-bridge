// Initializes the `system` service on path `/system`
import { ServiceAddons } from "@feathersjs/feathers";

import { Application } from "../../declarations";
import { Network } from "./network.class";
import hooks from "./network.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    network: Network & ServiceAddons<unknown>;
  }
}

export default function (app: Application): void {
  // Initialize our service with any options it requires
  app.use("/network", new Network({}, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("network");

  service.hooks(hooks);
}
