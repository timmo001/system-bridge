import { Injectable } from "@nestjs/common";
import {
  networkConnections,
  networkGatewayDefault,
  networkInterfaceDefault,
  networkInterfaces,
  networkStats,
  Systeminformation,
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
      connections: await this.findConnections(),
      gatewayDefault: await this.findGatewayDefault(),
      interfaceDefault: await this.findInterfaceDefault(),
      interfaces: await this.findInterfaces(),
      stats: await this.findStats(),
      wifi: {
        connections: await this.findWifiConnections(),
        interfaces: await this.findWifiInterfaces(),
        networks: await this.findWifiNetworks(),
      },
    };
  }

  async findConnections(): Promise<Systeminformation.NetworkConnectionsData[]> {
    return await networkConnections();
  }

  async findGatewayDefault(): Promise<string> {
    return await networkGatewayDefault();
  }

  async findInterfaceDefault(): Promise<string> {
    return await networkInterfaceDefault();
  }

  async findInterfaces(): Promise<{
    [iface: string]: Systeminformation.NetworkInterfacesData;
  }> {
    return convertArrayToObject(await networkInterfaces(), "iface");
  }

  async findStats(): Promise<{
    [iface: string]: Systeminformation.NetworkStatsData;
  }> {
    return convertArrayToObject(await networkStats(), "iface");
  }

  async findWifiConnections(): Promise<{
    [id: string]: Systeminformation.WifiConnectionData;
  }> {
    return convertArrayToObject(await wifiConnections(), "id");
  }

  async findWifiInterfaces(): Promise<{
    [iface: string]: Systeminformation.WifiInterfaceData;
  }> {
    return convertArrayToObject(await wifiInterfaces(), "iface");
  }

  async findWifiNetworks(): Promise<{
    [ssid: string]: Systeminformation.WifiNetworkData;
  }> {
    return convertArrayToObject(await wifiNetworks(), "ssid");
  }
}
