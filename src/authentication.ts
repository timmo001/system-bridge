import { ServiceAddons } from "@feathersjs/feathers";
import { NotAuthenticated } from "@feathersjs/errors";
import {
  AuthenticationBaseStrategy,
  AuthenticationResult,
  AuthenticationService,
} from "@feathersjs/authentication";
import { IncomingMessage } from "http";

import { Application } from "./declarations";

declare module "./declarations" {
  interface ServiceTypes {
    authentication: AuthenticationService & ServiceAddons<unknown>;
  }
}

class ApiKeyStrategy extends AuthenticationBaseStrategy {
  async authenticate(authentication: AuthenticationResult) {
    const { apiKey } = authentication;

    console.log("authenticate:", apiKey);
    if (apiKey !== "abc235") throw new NotAuthenticated("Invalid API Key");

    return {
      apiKey: true,
    };
  }

  async parse(req: IncomingMessage) {
    const apiKey = req.headers["api-key"];
    console.log("parse:", apiKey);
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
  const authentication = new AuthenticationService(app);

  authentication.register("api-key", new ApiKeyStrategy());

  app.use("/authentication", authentication);
}
