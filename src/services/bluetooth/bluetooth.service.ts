// Initializes the `system` service on path `/system`
import { ServiceAddons } from "@feathersjs/feathers";

import { Application } from "../../declarations";
import { Bluetooth } from "./bluetooth.class";
import hooks from "./bluetooth.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    bluetooth: Bluetooth & ServiceAddons<unknown>;
  }
}

export default function (app: Application): void {
  // Initialize our service with any options it requires
  app.use("/bluetooth", new Bluetooth({}, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("bluetooth");

  service.hooks(hooks);
}
