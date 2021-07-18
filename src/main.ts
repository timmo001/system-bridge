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
import AutoLaunch from "auto-launch";
import execa from "execa";
import helmet from "helmet";

import { AppModule } from "./app.module";
import {
  appDataDirectory,
  getConnection,
  getSettingsObject,
  getVersion,
} from "./common";
import { Events } from "./events";
import { WsAdapter } from "./ws-adapter";
import logger from "./logger";

let app: NestExpressApplication,
  server: Server | undefined,
  rtc: { createRTCWindow: () => void; closeRTCWindow: () => boolean };

const events: Events = new Events();

export async function updateAppConfig(): Promise<void> {
  try {
    const connection = await getConnection();
    const settings = await getSettingsObject(connection);
    await connection.close();

    const launchOnStartup: boolean =
      settings["general-launchOnStartup"] === "true";

    const autoLaunch = new AutoLaunch({
      name: "System Bridge",
      path: process.execPath,
    });
    if (launchOnStartup && process.env.NODE_ENV !== "development")
      await autoLaunch.enable();
    else await autoLaunch.disable();

    logger.info(
      `Main - Launch on startup: ${launchOnStartup} - ${
        (await autoLaunch.isEnabled()) ? "enabled" : "disabled"
      } - ${process.execPath}`
    );
  } catch (e) {
    logger.error(e.message);
  }
}

export async function startServer(): Promise<void> {
  const version = getVersion();

  logger.info(
    "-----------------------------------------------------------------------------------------------------------------------"
  );
  logger.info(
    `System Bridge ${version}: ${JSON.stringify(process.argv)} - ${
      process.env.NODE_ENV
    }`
  );
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

  // Setup app data directory
  if (!existsSync(appDataDirectory)) mkdirSync(appDataDirectory);

  // Serve public directory
  const publicDir = join(__dirname, "../public");
  if (!existsSync(publicDir)) mkdirSync(publicDir);
  app.useStaticAssets(publicDir);

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

  server.on("error", (err: any) => logger.error("Server error:", err));
  server.on("listening", async () => {
    logger.info(`Main - API started on port ${apiPort}`);
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
              websocketAddress: `ws://${siOsInfo.fqdn}:${wsPort}`,
              wsPort: wsPort,
            },
          },
          (error: any, service: { fullname: any; port: any }) => {
            if (error) logger.warn("Main - MDNS error:", error);
            else
              logger.info(
                `Main - Sent mdns advertisement on port ${service.fullname}:${service.port}`
              );
          }
        );
      } catch (e) {
        logger.warn("Main - MDNS error:", e);
      }
    }
  });
  server.on("close", () => logger.info("Main - Server closing."));

  await app.listen(apiPort);

  // Set up RTC Broker
  const apiKey = settings["network-apiKey"];
  if (typeof apiKey === "string") {
    await updateAppConfig();
    const broker = ExpressPeerServer(server, {
      allow_discovery: true,
      key: apiKey,
    });
    broker.on("connection", (client) => {
      logger.info(`Main - Broker peer connected: ${client.getId()}`);
    });
    broker.on("disconnect", (client) => {
      logger.info(`Main - Broker peer disconnected: ${client.getId()}`);
    });
    app.use("/rtc", broker);
    logger.info(`Main - RTC broker created on path ${broker.path()}`);

    events.setup(wsPort, apiKey);
  }
}

export async function stopServer(): Promise<void> {
  if (app) {
    await app.close();
    logger.info("Main - Nest Application closed.");
  }
  if (server) {
    server.close();
    logger.info("Main - Server closed.");
  }
  if (rtc) rtc.closeRTCWindow();
  app = undefined;
  server = undefined;
  rtc = undefined;
}

async function openTray(): Promise<void> {
  try {
    const workingDirectory = process.execPath.substring(
      0,
      process.platform === "win32"
        ? process.execPath.lastIndexOf("\\")
        : process.execPath.lastIndexOf("/")
    );
    const trayPath = join(
      workingDirectory,
      `./system-bridge-tray${process.platform === "win32" ? ".exe" : ""}`
    );
    logger.info(`Main - Open Tray: ${trayPath}`);
    await execa(trayPath, [], { cwd: workingDirectory, windowsHide: true });
  } catch (e) {
    logger.error(`Main - Error Opening Tray: ${e.message}`);
    logger.info("Main - Retrying in 10 seconds...");
    setTimeout(() => openTray(), 10000);
  }
}

config();
startServer();
if (process.env.NODE_ENV !== "development") openTray();
