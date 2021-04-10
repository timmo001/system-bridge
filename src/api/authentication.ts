import { ServiceAddons } from "@feathersjs/feathers";
import { NotAuthenticated } from "@feathersjs/errors";
import {
  AuthenticationBaseStrategy,
  AuthenticationResult,
  AuthenticationService,
} from "@feathersjs/authentication";
import { IncomingMessage } from "http";

import { Application } from "./declarations";
import logger from "../logger";

export const testKey = "dec59a3f-ab58-40b4-a453-3b8340fc8b44";

declare module "./declarations" {
  interface ServiceTypes {
    authentication: AuthenticationService & ServiceAddons<unknown>;
  }
}

class ApiKeyStrategy extends AuthenticationBaseStrategy {
  async authenticate(authentication: AuthenticationResult) {
    const { apiKey } = authentication;

    let settings;
    try {
      settings = (await import("../common")).getSettings();
    } catch (e) {
      logger.error("Failed to get settings for authentication:", e);
      // Use default (only valid for tests)
      settings = {
        network: {
          items: { apiKey: { value: testKey } },
        },
      };
    }

    if (apiKey !== settings.network.items.apiKey.value)
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
