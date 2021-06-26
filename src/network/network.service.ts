import { Injectable } from "@nestjs/common";
import {
  networkConnections,
  networkGatewayDefault,
  networkInterfaceDefault,
  networkInterfaces,
  networkStats,
} from "systeminformation";

import { convertArrayToObject } from "../common";
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
    };
  }
}
