import { config } from "dotenv";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { copyFile, existsSync, mkdirSync, unlink } from "fs";
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
import createDesktopShortcut from "create-desktop-shortcuts";
import helmet from "helmet";

import { AppModule } from "./app.module";
import {
  appDataDirectory,
  getConnection,
  getSettingsObject,
  getVersion,
} from "./common";
import { Event } from "./events/entities/event.entity";
import { Tray } from "./tray";
import { WebSocketConnection } from "./websocket";
import { WsAdapter } from "./ws-adapter";
import logger from "./logger";

let app: NestExpressApplication,
  server: Server | undefined,
  rtc: { createRTCWindow: () => void; closeRTCWindow: () => boolean };

const tray = new Tray();

async function updateAppConfig(): Promise<void> {
  const connection = await getConnection();
  const settings = await getSettingsObject(connection);
  await connection.close();

  const launchOnStartup: boolean =
    settings["general-launchOnStartup"] === "true";
  logger.info(
    `Main - Launch on startup: ${settings["general-launchOnStartup"]} - ${launchOnStartup}`
  );
  if (process.platform === "linux") {
    if (launchOnStartup) {
      logger.info(
        `Main - Adding file to autostart directory ${
          process.env.NODE_ENV === "development" && " (Not adding as in dev)"
        }`
      );
      if (process.env.NODE_ENV !== "development")
        copyFile(
          "/usr/share/applications/system-bridge.desktop",
          "/etc/xdg/autostart/system-bridge.desktop",
          () => logger.info("Main - Copied desktop file to autostart directory")
        );
      if (existsSync("/etc/xdg/autostart/system-bridge.desktop"))
        unlink("/etc/xdg/autostart/system-bridge.desktop", () =>
          logger.info(`Main - Removed file from autostart directory: ${path}`)
        );
    }
  }
  if (process.platform === "win32") {
    const startupDir = join(
      process.env.APPDATA,
      "Microsoft/Windows/Start Menu/Programs/Startup"
    );
    if (launchOnStartup) {
      logger.info(
        `Main - Adding link to startup directory: ${startupDir}${
          process.env.NODE_ENV === "development" && " (Not adding as in dev)"
        }`
      );
      if (process.env.NODE_ENV !== "development") {
        const args = process.argv;
        const path = args.shift();
        createDesktopShortcut({
          windows: {
            filePath: path,
            arguments: args.join(" "),
            outputPath: startupDir,
            name: "System Bridge",
            comment: "A bridge for your systems",
          },
        });
      }
    } else {
      const path = join(startupDir, "System Bridge.lnk");
      if (existsSync(path))
        unlink(path, () =>
          logger.info(`Main - Removed link from startup directory: ${path}`)
        );
    }
  }
}

export async function startServer(): Promise<void> {
  const version = getVersion();

  logger.info(
    "-----------------------------------------------------------------------------------------------------------------------"
  );
  logger.info(`System Bridge ${version}: ${JSON.stringify(process.argv)}`);
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
              websocketAddress: `ws://${siOsInfo.fqdn}:${wsPort}`,
              wsPort: wsPort,
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
    const ws = new WebSocketConnection(wsPort, apiKey, true, () =>
      ws.sendEvent({ name: "open-rtc" })
    );
    ws.onEvent = async (event: Event) => {
      logger.info(`Main - Event: ${event.name}`);
      if (event.name === "update-app-config") {
        await updateAppConfig();
      }
    };
  }
  await updateAppConfig();
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
