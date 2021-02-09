import si, { Systeminformation } from "systeminformation";

export interface NetworkInfo {
  connections: Systeminformation.NetworkConnectionsData[];
  gatewayDefault: string;
  interfaceDefault: string;
  interfaces: Systeminformation.NetworkInterfacesData[];
  stats: Systeminformation.NetworkStatsData[];
}

export default class NetworkInfoService {
  async find(): Promise<NetworkInfo> {
    return {
      connections: await si.networkConnections(),
      gatewayDefault: await si.networkGatewayDefault(),
      interfaceDefault: await si.networkInterfaceDefault(),
      interfaces: await si.networkInterfaces(),
      stats: await si.networkStats(),
    };
  }
}
