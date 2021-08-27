import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
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
import helmet from "helmet";

import { AppModule } from "./app.module";
import {
  getApiKey,
  getConnection,
  getSettingsObject,
  getVersion,
} from "../common";
import { Events } from "../events";
import { Logger } from "../logger";
import { WsAdapter } from "./ws-adapter";

const { logger } = new Logger("API");

let app: NestExpressApplication,
  server: Server | undefined,
  rtc: { createRTCWindow: () => void; closeRTCWindow: () => boolean },
  events: Events;

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
      `Launch on startup: ${launchOnStartup} - ${
        (await autoLaunch.isEnabled()) ? "enabled" : "disabled"
      } - ${process.execPath}`
    );
  } catch (e) {
    logger.error(e.message);
  }
}

export async function startServer(): Promise<void> {
  const connection = await getConnection();
  const settings = await getSettingsObject(connection);
  await connection.close();

  const apiPort = Number(settings["network-apiPort"]) || 9170;
  const wsPort = Number(settings["network-wsPort"]) || 9172;

  const apiKey = await getApiKey(this.settingsRepository);

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
  const publicDir = join(__dirname, "../../../public");
  logger.info(`Serving public directory: ${publicDir}`);
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

  server.on("error", (error: any) => logger.error(`Server error: ${error}`));
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
        const version = getVersion(logger);
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
            if (error) logger.warn(`MDNS error: ${error}`);
            else
              logger.info(
                `Sent mdns advertisement on port ${service.fullname}:${service.port}`
              );
          }
        );
      } catch (error) {
        logger.warn(`MDNS error caught: ${error.message}`);
      }
    }
  });
  server.on("close", () => logger.info("Server closing."));

  await app.listen(apiPort);

  // Set up RTC Broker
  if (typeof apiKey === "string") {
    await updateAppConfig();

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

    events = new Events();
    events.setup(settings);
  }
}

export async function stopServer(): Promise<void> {
  if (app) {
    await app.close();
    logger.info("Nest Application closed.");
  }
  if (server) {
    server.close();
    logger.info("Server closed.");
  }
  if (events) events.cleanup();
  if (rtc) rtc.closeRTCWindow();
  app = undefined;
  server = undefined;
  events = undefined;
  rtc = undefined;
}
