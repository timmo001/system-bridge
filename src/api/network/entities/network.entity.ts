import { Systeminformation } from "systeminformation";

export interface Network {
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
