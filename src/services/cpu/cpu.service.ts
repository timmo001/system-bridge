// Initializes the `system` service on path `/system`
import { ServiceAddons } from "@feathersjs/feathers";

import { Application } from "../../declarations";
import { Cpu } from "./cpu.class";
import hooks from "./cpu.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    cpu: Cpu & ServiceAddons<unknown>;
  }
}

export default function (app: Application): void {
  // Initialize our service with any options it requires
  app.use("/cpu", new Cpu({}, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("cpu");

  service.hooks(hooks);
}
