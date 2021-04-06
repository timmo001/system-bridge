// Initializes the `notification` service on path `/notification`
import { ServiceAddons } from "@feathersjs/feathers";

import { Application } from "../../declarations";
import { Notification } from "./notification.class";
import hooks from "./notification.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    notification: Notification & ServiceAddons<unknown>;
  }
}

export default function (app: Application): void {
  // Initialize our service with any options it requires
  app.use("/notification", new Notification({}, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("notification");

  service.hooks(hooks);
}
