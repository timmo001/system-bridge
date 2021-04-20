import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ExpressPeerServer } from "peer";
import { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Server } from "http";
import helmet from "helmet";
import si, { Systeminformation } from "systeminformation";

import { AppModule } from "./app.module";
import { AuthGuard } from "./auth.guard";
import { getSettings } from "../common";
import logger from "../logger";

let app: INestApplication | undefined, server: Server | undefined;

async function startServer(): Promise<void> {
  const settings = getSettings();
  const networkSettings = settings?.network.items;

  const port: number =
    typeof networkSettings?.port?.value === "number"
      ? networkSettings?.port?.value
      : 9170;

  // Setup Nest.js app
  app = await NestFactory.create(AppModule);

  // Enable security
  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );
  // Enable CORS
  app.enableCors();
  // Enable Global Auth Guard
  app.useGlobalGuards(new AuthGuard());
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
        (await import("../rtc")).createRTCWindow();
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
  server.on("close", () => logger.info("Server closing."));
  app.listen(port);
}

async function stopServer(): Promise<void> {
  if (app) await app.close();
  logger.info("Server closed.");
  app = undefined;
  server = undefined;
}

export { server, startServer, stopServer };
