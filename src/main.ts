import { config } from "dotenv";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { existsSync, mkdirSync } from "fs";
import { ExpressPeerServer } from "peer";
import { join } from "path";
import { NestExpressApplication } from "@nestjs/platform-express";
import { NestFactory } from "@nestjs/core";
import {
  networkInterfaceDefault,
  networkInterfaces,
  osInfo,
  Systeminformation,
  uuid,
} from "systeminformation";
import { Server } from "http";
import helmet from "helmet";

import { AppModule } from "./app.module";
import { appDataDirectory, getConnection, getSettingsObject } from "./common";
import { Tray } from "./tray";
import { WebSocketConnection } from "./websocket";
import { WsAdapter } from "./ws-adapter";
import logger from "./logger";

let app: NestExpressApplication,
  server: Server | undefined,
  rtc: { createRTCWindow: () => void; closeRTCWindow: () => boolean };

const tray = new Tray();

export async function startServer(): Promise<void> {
  const version = process.env.APP_VERSION || "1.0.0";

  logger.info(
    "-----------------------------------------------------------------------------------------------------------------------"
  );
  logger.info(`System Bridge API ${version}: ${JSON.stringify(process.argv)}`);
  logger.info(
    "-----------------------------------------------------------------------------------------------------------------------"
  );

  const connection = await getConnection();
  const settings = await getSettingsObject(connection);
  await connection.close();

  const apiPort = Number(settings["network-apiPort"]) || 9170;
  const wsPort = Number(settings["network-wsPort"]) || 9172;

  // Setup Nest.js app
  app = await NestFactory.create<NestExpressApplication>(AppModule);

  // WS adapter
  app.useWebSocketAdapter(new WsAdapter(app, wsPort));

  // Enable security
  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );
  // Enable CORS
  app.enableCors();

  // Serve public directory
  if (!existsSync(appDataDirectory)) mkdirSync(appDataDirectory);
  const publicDir = join(appDataDirectory, "public");
  if (!existsSync(publicDir)) mkdirSync(publicDir);
  app.useStaticAssets(publicDir);
  // Remove any existing cover
  const ws = new WebSocketConnection(
    Number(settings["network-wsPort"]) || 9172,
    settings["network-apiKey"],
    false,
    () => ws.sendEvent({ name: "player-cover-clear" })
  );

  // Setup Open API
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("System Bridge")
      .setDescription("A bridge for your systems")
      .build()
  );
  SwaggerModule.setup("docs", app, document);

  // Get server from app
  server = app.getHttpServer();

  if (!server) {
    console.error("No server found!. Aborting");
    return;
  }

  // Set up RTC Broker
  const apiKey = settings["network-apiKey"];
  if (typeof apiKey === "string") {
    const broker = ExpressPeerServer(server, {
      allow_discovery: true,
      key: apiKey,
    });
    broker.on("connection", (client) => {
      logger.info(`Broker peer connected: ${client.getId()}`);
    });
    broker.on("disconnect", (client) => {
      logger.info(`Broker peer disconnected: ${client.getId()}`);
    });
    app.use("/rtc", broker);
    logger.info(`RTC broker created on path ${broker.path()}`);
    const ws = new WebSocketConnection(wsPort, apiKey, false, () => {
      ws.sendEvent({ name: "open-rtc" });
      ws.close();
    });
  }

  server.on("error", (err: any) => logger.error("Server error:", err));
  server.on("listening", async () => {
    logger.info(`API started on port ${apiPort}`);
    const siOsInfo: Systeminformation.OsData = await osInfo();
    const uuidInfo: Systeminformation.UuidData = await uuid();
    const defaultInterface: string = await networkInterfaceDefault();
    const networkInterface:
      | Systeminformation.NetworkInterfacesData
      | undefined = (await networkInterfaces()).find(
      (ni: Systeminformation.NetworkInterfacesData) =>
        ni.iface === defaultInterface
    );

    if (networkInterface) {
      try {
        const MDNS = await import("mdns");
        MDNS.createAdvertisement(
          MDNS.udp("system-bridge"),
          apiPort,
          {
            name: `System Bridge - ${siOsInfo.fqdn}`,
            txtRecord: {
              address: `http://${siOsInfo.fqdn}:${apiPort}`,
              fqdn: siOsInfo.fqdn,
              host: siOsInfo.hostname,
              ip: networkInterface.ip4,
              mac: networkInterface.mac,
              port: apiPort,
              uuid: uuidInfo.os,
              version,
              websocketAddress: `ws://${siOsInfo.fqdn}:${apiPort}`,
            },
          },
          (error: any, service: { fullname: any; port: any }) => {
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
  server.on("close", () => logger.info("Server closing."));
  await app.listen(apiPort);
}

export async function stopServer(): Promise<void> {
  if (app) {
    await app.close();
    logger.info("App closed.");
  }
  if (server) {
    server.close();
    logger.info("Server closed.");
  }
  if (rtc) rtc.closeRTCWindow();
  app = undefined;
  server = undefined;
  rtc = undefined;
}

config();
startServer();
tray.setupTray();
