import si, { Systeminformation } from "systeminformation";

import { Application } from "../../declarations";
import { convertArrayToObject } from "../../common";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ServiceOptions {}

export interface NetworkInfo {
  connections: Systeminformation.NetworkConnectionsData[];
  gatewayDefault: string;
  interfaceDefault: string;
  interfaces: {
    [iface: string]: Systeminformation.NetworkInterfacesData;
  };
  stats: {
    [iface: string]: Systeminformation.NetworkStatsData;
  };
}

export class Network {
  app: Application;
  options: ServiceOptions;

  constructor(options: ServiceOptions = {}, app: Application) {
    this.options = options;
    this.app = app;
  }

  async find(): Promise<NetworkInfo> {
    return {
      connections: await si.networkConnections(),
      gatewayDefault: await si.networkGatewayDefault(),
      interfaceDefault: await si.networkInterfaceDefault(),
      interfaces: convertArrayToObject(await si.networkInterfaces(), "iface"),
      stats: convertArrayToObject(await si.networkStats(), "iface"),
    };
  }
}
