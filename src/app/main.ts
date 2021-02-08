import { ipcMain } from "electron";
import feathers from "@feathersjs/feathers";
import "@feathersjs/transport-commons";
import express from "@feathersjs/express";
import socketio from "@feathersjs/socketio";
import swagger from "feathers-swagger";

import { Configuration } from "../configuration";
import { getSettings } from "../utils";
import SystemInfoService from "./services/info/system";
import CpuInfoService from "./services/info/cpu";

class Main {
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
    const apiSettings = this.settings?.api.items;

    // Creates an ExpressJS compatible Feathers application
    const app = express(feathers());

    // Express middleware to parse HTTP JSON bodies
    app.use(express.json());
    // Express middleware to parse URL-encoded params
    app.use(express.urlencoded({ extended: true }));
    // Express middleware to to host static files from the current folder
    // app.use(express.static(__dirname));
    // Add REST API support
    app.configure(express.rest());
    // Configure Socket.io real-time APIs
    app.configure(socketio());
    // Create OpenAPI docs
    app.configure(
      swagger({
        specs: {
          info: {
            title: "System Bridge",
            description: "Lorem Ipsum",
            version: "1.0.0",
          },
        },
      })
    );

    // Register services
    app.use("/info/system", new SystemInfoService());
    app.use("/info/cpu", new CpuInfoService());

    // Express middleware with a nicer error handler
    app.use(express.errorHandler());

    // Add any new real-time connection to the `everybody` channel
    app.on("connection", (connection) =>
      app.channel("everybody").join(connection)
    );
    // Publish all events to the `everybody` channel
    app.publish(() => app.channel("everybody"));

    // Start the server
    app
      .listen(apiSettings?.port?.value)
      .on("listening", () =>
        console.log(`Server listening on port ${apiSettings?.port?.value}`)
      );
  }
}

export default Main;
