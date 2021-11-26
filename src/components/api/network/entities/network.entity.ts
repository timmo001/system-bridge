import { Systeminformation } from "systeminformation";

export interface Network {
  connections: Array<Systeminformation.NetworkConnectionsData>;
  gatewayDefault: string;
  interfaceDefault: string;
  interfaces: {
    [iface: string]: Systeminformation.NetworkInterfacesData;
  };
  stats: {
    [iface: string]: Systeminformation.NetworkStatsData;
  };
  wifi: {
    connections: {
      [id: string]: Systeminformation.WifiConnectionData;
    };
    interfaces: {
      [iface: string]: Systeminformation.WifiInterfaceData;
    };
    networks: {
      [ssid: string]: Systeminformation.WifiNetworkData;
    };
  };
}
