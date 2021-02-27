import { ServiceAddons } from "@feathersjs/feathers";
import { NotAuthenticated } from "@feathersjs/errors";
import {
  AuthenticationBaseStrategy,
  AuthenticationResult,
  AuthenticationService,
} from "@feathersjs/authentication";
import { IncomingMessage } from "http";

import { Application } from "./declarations";
import { getSettings } from "./utils";

declare module "./declarations" {
  interface ServiceTypes {
    authentication: AuthenticationService & ServiceAddons<unknown>;
  }
}

class ApiKeyStrategy extends AuthenticationBaseStrategy {
  async authenticate(authentication: AuthenticationResult) {
    const { apiKey } = authentication;

    const settings = getSettings();
    const settingsAPiKey = settings.network.items.apiKey.value;

    if (apiKey !== settingsAPiKey)
      throw new NotAuthenticated("Invalid API Key");

    return {
      apiKey: true,
    };
  }

  async parse(req: IncomingMessage) {
    const apiKey = req.headers["api-key"];
    if (apiKey) {
      return {
        strategy: this.name,
        apiKey,
      };
    }
    return null;
  }
}

export default function (app: Application): void {
  const authentication = new AuthenticationService(app, "api-key", {
    entity: null,
    service: null,
    secret: "S0Can9hFxEblnG+oGXtht/qrrPg=",
    authStrategies: ["api-key"],
  });

  authentication.register("api-key", new ApiKeyStrategy());

  app.use("/authentication", authentication);
}
