import { app as electronApp, ipcMain } from "electron";
import { createServer, Server } from "http";
import { ExpressPeerServer } from "peer";
import { join } from "path";
import compress from "compression";
import cors from "cors";
import favicon from "serve-favicon";
import helmet from "helmet";
import si, { Systeminformation } from "systeminformation";

import feathers from "@feathersjs/feathers";
import "@feathersjs/transport-commons";
import express from "@feathersjs/express";
import socketio from "@feathersjs/socketio";
import swagger from "feathers-swagger";

import { Application } from "./declarations";
import { Configuration } from "./configuration";
import { createRTCWindow } from ".";
import { getSettings } from "./utils";
import appHooks from "./app.hooks";
import authentication from "./authentication";
import channels from "./channels";
import logger from "./logger";
import middleware from "./middleware";
import services from "./services";

class API {
  private server?: Server;
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
    const app: Application = express(feathers());
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
        join(electronApp.getAppPath(), "./public/system-bridge-circle.ico")
      )
    );
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
    // Set up event channels (see channels.ts)
    app.configure(channels);
    // Set up our services (see `services/index.ts`)
    app.configure(services);

    app.hooks(appHooks);

    // Configure a middleware for 404s and the error handler
    // app.use(express.notFound());
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
        : 9170;
    this.server = createServer(app);

    // Set up RTC Broker
    const key = networkSettings?.apiKey.value;
    if (typeof key === "string") {
      const broker = ExpressPeerServer(this.server, {
        allow_discovery: true,
        key,
      });
      broker.on("connection", (client) => {
        logger.info(`Broker peer connected: ${client.getId()}`);
      });
      broker.on("disconnect", (client) => {
        logger.info(`Broker peer disconnected: ${client.getId()}`);
      });
      app.use("/rtc", broker);
      logger.info(`RTC broker created on path ${broker.path()}`);
      createRTCWindow();
    }

    this.server.on("error", (err) => logger.error("Server error:", err));
    this.server.on("listening", async () => {
      logger.info(`API started on port ${port}`);
      const osInfo: Systeminformation.OsData = await si.osInfo();
      const uuidInfo: Systeminformation.UuidData = await si.uuid();
      const defaultInterface: string = await si.networkInterfaceDefault();
      const networkInterface:
        | Systeminformation.NetworkInterfacesData
        | undefined = (await si.networkInterfaces()).find(
        (ni: Systeminformation.NetworkInterfacesData) =>
          ni.iface === defaultInterface
      );
      if (networkInterface) {
        try {
          const MDNS = await import("mdns");
          MDNS.createAdvertisement(
            MDNS.udp("system-bridge"),
            port,
            {
              name: `System Bridge - ${osInfo.fqdn}`,
              txtRecord: {
                address: `http://${osInfo.fqdn}:${port}`,
                fqdn: osInfo.fqdn,
                host: osInfo.hostname,
                ip: networkInterface.ip4,
                mac: networkInterface.mac,
                port,
                uuid: uuidInfo.os,
              },
            },
            (error, service) => {
              if (error) logger.warn(error);
              else
                logger.info(
                  `Sent mdns advertisement on port ${service.fullname}:${service.port}`
                );
            }
          );
        } catch (e) {
          logger.warn("MDNS error:", e);
        }
      }
    });
    this.server.on("close", () => logger.info("Server closing."));
    this.server.listen(port);
  }

  async cleanup(): Promise<void> {
    return await new Promise<void>((resolve) => {
      if (this.server)
        this.server.close((err) => {
          if (err) logger.error("Error closing server:", err);
          logger.info("Server closed.");
          this.server = undefined;
          resolve();
        });
    });
  }
}

export default API;
