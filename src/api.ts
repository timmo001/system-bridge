import { ipcMain } from "electron";
import { join } from "path";
import compress from "compression";
import cors from "cors";
import favicon from "serve-favicon";
import helmet from "helmet";
import { createServer, Server } from "http";
import si, { Systeminformation } from "systeminformation";
import bonjour from "bonjour";

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
  private server?: Server;
  private settings?: Configuration;

  constructor() {
    ipcMain.on("updated-setting", this.getSettings);

    process.on("unhandledRejection", (error: Error) => logger.error(error));
    process.on("uncaughtException", (error: Error) => logger.error(error));

    this.getSettings();
    this.setupConnection();
  }

  private getSettings(): void {
    this.settings = getSettings();
  }

  private async setupConnection(): Promise<void> {
    const networkSettings = this.settings?.network.items;

    // Creates an ExpressJS compatible Feathers application
    const app: Application = express(feathers());
    // Load app configuration
    app.configure(configuration());
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
    app.use(favicon(join(app.get("public"), "favicon.ico")));
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

    // Configure other middleware (see `middleware/index.js`)
    app.configure(middleware);
    // Configure authentication
    app.configure(authentication);
    // Set up our services (see `services/index.js`)
    app.configure(services);
    // Set up event channels (see channels.js)
    app.configure(channels);

    app.hooks(appHooks);

    // Configure a middleware for 404s and the error handler
    app.use(express.notFound());
    // Express middleware with a nicer error handler
    app.use(express.errorHandler({ logger }));

    // Add any new real-time connection to the `everybody` channel
    app.on("connection", (connection) =>
      app?.channel("everybody").join(connection)
    );
    // Publish all events to the `everybody` channel
    app.publish(() => app?.channel("everybody"));

    app.setup(this.server);

    // Start the server
    const port: number =
      typeof networkSettings?.port?.value === "number"
        ? networkSettings?.port?.value
        : 9;
    const mdnsPort = Number(`4${port}`);
    this.server = createServer(app);
    this.server.on("error", (err) => logger.error(err));
    this.server.on("listening", async () => {
      logger.info(`API started on port ${port}`);
      const osInfo: Systeminformation.OsData = await si.osInfo();
      const defaultInterface: string = await si.networkInterfaceDefault();
      const networkInterface:
        | Systeminformation.NetworkInterfacesData
        | undefined = (await si.networkInterfaces()).find(
        (ni: Systeminformation.NetworkInterfacesData) =>
          ni.iface === defaultInterface
      );
      bonjour().publish({
        name: `System Bridge - ${osInfo.fqdn}`,
        type: "system-bridge",
        protocol: "tcp",
        port: mdnsPort,
        txt: {
          address: `http://${osInfo.fqdn}:${port}`,
          fqdn: osInfo.fqdn,
          host: osInfo.hostname,
          ip: networkInterface?.ip4 || "",
          mac: networkInterface?.mac || "",
          port: String(port),
        },
      });
      logger.info(`Sent mdns advertisement on port ${mdnsPort}`);
    });
    this.server.on("close", () => logger.info("Server closing."));
    this.server.listen(port);
  }

  async cleanup(): Promise<void> {
    return await new Promise<void>((resolve) => {
      if (this.server)
        this.server.close((err) => {
          if (err) logger.error(err);
          logger.info("Server closed.");
          this.server = undefined;
          resolve();
        });
    });
  }
}

export default API;
