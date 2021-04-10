import { createServer, Server } from "http";
import { ExpressPeerServer } from "peer";
import si, { Systeminformation } from "systeminformation";

import { Configuration } from "../configuration";
import app from "./app";
import logger from "../logger";

let server: Server | undefined;
const startServer = async () => {
  let settings: Configuration | undefined;
  try {
    settings = (await import("../common")).getSettings();
  } catch (e) {
    logger.error("Failed to get settings for API:", e);
  }

  const networkSettings = settings?.network.items;

  const port: number =
    typeof networkSettings?.port?.value === "number"
      ? networkSettings?.port?.value
      : 9170;
  server = createServer(app);

  app.setup(server);

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
  server.listen(port);
};

async function stopServer(): Promise<void> {
  return await new Promise<void>((resolve) => {
    if (server)
      server.close((err) => {
        if (err) logger.error("Error closing server:", err);
        logger.info("Server closed.");
        server = undefined;
        resolve();
      });
  });
}

export { server, startServer, stopServer };
