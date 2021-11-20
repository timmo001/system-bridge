import {
  networkInterfaceDefault,
  networkInterfaces,
  osInfo,
  Systeminformation,
  uuid,
} from "systeminformation";
import { getVersion } from "../common";
import { Logger } from "../logger";
import { MDNSTextRecord } from "./mdnsTextRecord";

export class MDNSAdversisement {
  async createAdvertisement(apiPort: number, wsPort: number) {
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
        const { logger } = new Logger("MDNSAdversisement");
        const version = getVersion(logger);
        logger.close();

        const MDNS = await import("mdns");
        const mdnsTextRecord: MDNSTextRecord = {
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
        };
        MDNS.createAdvertisement(
          MDNS.udp("system-bridge"),
          apiPort,
          {
            name: `System Bridge - ${siOsInfo.fqdn}`,
            txtRecord: mdnsTextRecord,
          },
          (error: any, service: { fullname: any; port: any }) => {
            const { logger } = new Logger("MDNSAdversisement");
            if (error) logger.warn(`MDNS error: ${error}`);
            else
              logger.info(
                `Sent mdns advertisement on port ${service.fullname}:${service.port}`
              );
            logger.close();
          }
        );
      } catch (error) {
        const { logger } = new Logger("MDNSAdversisement");
        logger.warn(`MDNS error caught: ${error.message}`);
        logger.close();
      }
    }
  }
}
