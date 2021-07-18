import { Injectable } from "@nestjs/common";
import {
  networkInterfaceDefault,
  networkInterfaces,
  osInfo,
  Systeminformation,
  uuid,
} from "systeminformation";

import { Information } from "./entities/information.entity";
import {
  getConnection,
  getSettingsObject,
  getUpdates,
  getVersion,
} from "../common";

@Injectable()
export class InformationService {
  async findAll(): Promise<Information> {
    const connection = await getConnection();
    const settings = await getSettingsObject(connection);
    await connection.close();

    const apiPort = Number(settings["network-apiPort"]) || 9170;
    const websocketPort = Number(settings["network-wsPort"]) || 9172;

    const osSiInfo: Systeminformation.OsData = await osInfo();
    const uuidInfo: Systeminformation.UuidData = await uuid();
    const defaultInterface: string = await networkInterfaceDefault();
    const networkInterface:
      | Systeminformation.NetworkInterfacesData
      | undefined = (await networkInterfaces()).find(
      (ni: Systeminformation.NetworkInterfacesData) =>
        ni.iface === defaultInterface
    );

    if (networkInterface) {
      const data: Information = {
        address: `http://${osSiInfo.fqdn}:${apiPort}`,
        apiPort,
        fqdn: osSiInfo.fqdn,
        host: osSiInfo.hostname,
        ip: networkInterface.ip4,
        mac: networkInterface.mac,
        updates: await getUpdates(),
        uuid: uuidInfo,
        version: getVersion(),
        websocketAddress: `ws://${osSiInfo.fqdn}:${websocketPort}`,
        websocketPort,
      };
      return data;
    }
    return undefined;
  }
}
