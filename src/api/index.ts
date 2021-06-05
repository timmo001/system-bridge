import { app as electronApp } from "electron";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { existsSync, mkdirSync } from "fs";
import { ExpressPeerServer } from "peer";
import { INestApplication } from "@nestjs/common";
import { join } from "path";
import { NestFactory } from "@nestjs/core";
import { Server } from "http";
import { WsAdapter } from "@nestjs/platform-ws";
import helmet from "helmet";
import si, { Systeminformation } from "systeminformation";

import { AppModule } from "./app.module";
import { getSettings } from "../common";
import { HttpAuthGuard } from "./httpAuth.guard";
import { NestExpressApplication } from "@nestjs/platform-express";
import { savePlayerCover } from "../player";
import logger from "../logger";

let app: INestApplication | undefined,
  server: Server | undefined,
  rtc: { createRTCWindow: () => void; closeRTCWindow: () => boolean };

async function startServer(): Promise<void> {
  const settings = getSettings();
  const networkSettings = settings?.network.items;

  const port: number =
    typeof networkSettings?.port?.value === "number"
      ? networkSettings?.port?.value
      : 9170;

  // Setup Nest.js app
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // WS adapter
  app.useWebSocketAdapter(new WsAdapter(app));

  // Enable security
  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );
  // Enable CORS
  app.enableCors();
  // Enable Global Auth Guard
  app.useGlobalGuards(new HttpAuthGuard());

  // Serve public directory
  const publicDir = join(electronApp.getPath("userData"), "public");
  if (!existsSync(publicDir)) mkdirSync(publicDir);
  app.useStaticAssets(publicDir);
  // Remove any existing cover
  await savePlayerCover();

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
  const key = networkSettings?.apiKey.value;
  if (typeof key === "string") {
    const broker = ExpressPeerServer(server, {
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
    (async () => {
      try {
        rtc = await import("../rtc");
        rtc.createRTCWindow();
      } catch (e) {
        logger.warn("Couldn't create RTC window: ", e);
      }
    })();
  }

  server.on("error", (err) => logger.error("Server error:", err));
  server.on("listening", async () => {
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
    const websocketPort: number =
      typeof networkSettings?.wsPort?.value === "number"
        ? networkSettings?.wsPort?.value
        : 9172;

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
              version: electronApp.getVersion(),
              websocketAddress: `ws://${osInfo.fqdn}:${websocketPort}`,
              websocketPort,
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
  server.on("close", () => logger.info("Server closing."));
  app.listen(port);
}

async function stopServer(): Promise<void> {
  if (app) {
    await app.close();
    logger.info("App closed.");
  }
  if (server) {
    server.close();
    logger.info("Server closed.");
  }
  if (rtc) {
    rtc.closeRTCWindow();
  }
  app = undefined;
  server = undefined;
}

export { server, startServer, stopServer };
