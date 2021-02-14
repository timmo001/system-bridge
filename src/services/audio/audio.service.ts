// Initializes the `system` service on path `/system`
import { ServiceAddons } from "@feathersjs/feathers";

import { Application } from "../../declarations";
import { Audio } from "./audio.class";
import hooks from "./audio.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    audio: Audio & ServiceAddons<unknown>;
  }
}

export default function (app: Application): void {
  // Initialize our service with any options it requires
  app.use("/audio", new Audio({}, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("audio");

  service.hooks(hooks);
}
