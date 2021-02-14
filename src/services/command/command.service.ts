// Initializes the service
import { ServiceAddons } from "@feathersjs/feathers";

import { Application } from "../../declarations";
import { Command } from "./command.class";
import hooks from "./command.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    command: Command & ServiceAddons<unknown>;
  }
}

export default function (app: Application): void {
  const paginate = app.get("paginate");

  const options = {
    paginate,
  };

  // Initialize our service with any options it requires
  app.use("/api/command", new Command(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("command");

  service.hooks(hooks);
}
