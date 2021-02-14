import { ipcMain } from "electron";
import { join } from "path";
import favicon from "serve-favicon";
import compress from "compression";
import helmet from "helmet";
import cors from "cors";

import feathers from "@feathersjs/feathers";
import configuration from "@feathersjs/configuration";
import "@feathersjs/transport-commons";
import express from "@feathersjs/express";
import socketio from "@feathersjs/socketio";
import swagger from "feathers-swagger";

import { Application } from "./declarations";
import { Configuration } from "./configuration";
import { getSettings } from "./utils";
import logger from "./logger";
import middleware from "./middleware";
import services from "./services";
import appHooks from "./app.hooks";
import channels from "./channels";
import authentication from "./authentication";

class API {
  private app?: Application;
  private settings?: Configuration;

  constructor() {
    ipcMain.on("updated-setting", this.getSettings);

    this.getSettings();
    this.setupConnection();
  }

  private getSettings(): void {
    this.settings = getSettings();
  }

  private async setupConnection(): Promise<void> {
    const networkSettings = this.settings?.network.items;

    // Creates an ExpressJS compatible Feathers application
    this.app = express(feathers());
    // Load app configuration
    this.app.configure(configuration());
    // Enable security, CORS, compression, favicon and body parsing
    this.app.use(
      helmet({
        contentSecurityPolicy: false,
      })
    );
    this.app.use(cors());
    this.app.use(compress());
    // Express middleware to parse HTTP JSON bodies
    this.app.use(express.json());
    // Express middleware to parse URL-encoded params
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(favicon(join(this.app.get("public"), "favicon.ico")));
    // Host the public folder
    this.app.use(express.static(this.app.get("public")));
    // Add REST API support
    this.app.configure(express.rest());
    // Configure Socket.io real-time APIs
    this.app.configure(socketio());
    // Create OpenAPI docs
    this.app.configure(
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

    // Configure other middleware (see `middleware/index.js`)
    this.app.configure(middleware);
    // Configure authentication
    this.app.configure(authentication);
    // Set up our services (see `services/index.js`)
    this.app.configure(services);
    // Set up event channels (see channels.js)
    this.app.configure(channels);

    this.app.hooks(appHooks);

    // Configure a middleware for 404s and the error handler
    this.app.use(express.notFound());
    // Express middleware with a nicer error handler
    this.app.use(express.errorHandler({ logger }));

    // Add any new real-time connection to the `everybody` channel
    this.app.on("connection", (connection) =>
      this.app?.channel("everybody").join(connection)
    );
    // Publish all events to the `everybody` channel
    this.app.publish(() => this.app?.channel("everybody"));

    process.on("unhandledRejection", (error: Error) => logger.error(error));

    // Start the server
    this.app
      .listen(networkSettings?.port?.value)
      .on("listening", () =>
        logger.info(`API started on port ${networkSettings?.port?.value}`)
      );
  }

  async cleanup(): Promise<void> {
    this.app?.removeAllListeners();
    this.app = undefined;
  }
}

export default API;
