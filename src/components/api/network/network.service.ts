import { Injectable } from "@nestjs/common";
import {
  networkConnections,
  networkGatewayDefault,
  networkInterfaceDefault,
  networkInterfaces,
  networkStats,
  wifiConnections,
  wifiInterfaces,
  wifiNetworks,
} from "systeminformation";

import { convertArrayToObject } from "../../common";
import { Network } from "./entities/network.entity";

@Injectable()
export class NetworkService {
  async findAll(): Promise<Network> {
    return {
      connections: await networkConnections(),
      gatewayDefault: await networkGatewayDefault(),
      interfaceDefault: await networkInterfaceDefault(),
      interfaces: convertArrayToObject(await networkInterfaces(), "iface"),
      stats: convertArrayToObject(await networkStats(), "iface"),
      wifi: {
        connections: convertArrayToObject(await wifiConnections(), "id"),
        interfaces: convertArrayToObject(await wifiInterfaces(), "iface"),
        networks: convertArrayToObject(await wifiNetworks(), "ssid"),
      },
    };
  }
}
