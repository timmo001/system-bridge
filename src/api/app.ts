import { app as electronApp } from "electron";
import { join } from "path";
import compress from "compression";
import cors from "cors";
import favicon from "serve-favicon";
import helmet from "helmet";

import feathers, {
  HookContext as FeathersHookContext,
} from "@feathersjs/feathers";
import "@feathersjs/transport-commons";
import express from "@feathersjs/express";
import socketio from "@feathersjs/socketio";
import swagger from "feathers-swagger";

import { Application } from "./declarations";
import appHooks from "./app.hooks";
import authentication from "./authentication";
import channels from "./channels";
import logger from "../logger";
import middleware from "./middleware";
import services from "./services";

// Creates an ExpressJS compatible Feathers application
const app: Application = express(feathers());
export type HookContext<T = unknown> = {
  app: Application;
} & FeathersHookContext<T>;

// Enable security, CORS, compression, favicon and body parsing
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(cors());
app.use(compress());
// Express middleware to parse HTTP JSON bodies
app.use(express.json());
// Express middleware to parse URL-encoded params
app.use(express.urlencoded({ extended: true }));
// Set favicon
app.use(
  favicon(
    join(electronApp?.getAppPath() || "", "public/system-bridge-circle.ico")
  )
);
// Host the public folder
app.use(express.static(join(electronApp?.getAppPath() || "", "public")));
// Trust proxy (reverse proxy)
app.set("trust proxy", true);
// Add REST API support
app.configure(express.rest());
// Configure Socket.io real-time APIs
app.configure(socketio());
// Create OpenAPI docs
app.configure(
  swagger({
    docsPath: "/docs",
    openApiVersion: 3.0,
    uiIndex: true,
    specs: {
      info: {
        title: "System Bridge",
        description: "Lorem Ipsum",
        version: "1.0.0",
      },
    },
  })
);

// Configure other middleware (see `middleware/index.ts`)
app.configure(middleware);
// Configure authentication
app.configure(authentication);
// Set up our services (see `services/index.ts`)
app.configure(services);
// Set up event channels (see channels.ts)
app.configure(channels);

// Configure a middleware for 404s and the error handler
app.use(express.notFound());
// Express middleware with a nicer error handler
app.use(express.errorHandler({ logger }));

app.hooks(appHooks);

// Add any new real-time connection to the `everybody` channel
app.on("connection", (connection) =>
  app?.channel("everybody").join(connection)
);
// Publish all events to the `everybody` channel
app.publish(() => app?.channel("everybody"));

export default app;
