import { Injectable } from "@nestjs/common";
import si from "systeminformation";

import { convertArrayToObject } from "../../common";
import { Network } from "./entities/network.entity";

@Injectable()
export class NetworkService {
  async findAll(): Promise<Network> {
    return {
      connections: await si.networkConnections(),
      gatewayDefault: await si.networkGatewayDefault(),
      interfaceDefault: await si.networkInterfaceDefault(),
      interfaces: convertArrayToObject(await si.networkInterfaces(), "iface"),
      stats: convertArrayToObject(await si.networkStats(), "iface"),
    };
  }
}
