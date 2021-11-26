import { Controller, Get, UseGuards } from "@nestjs/common";
import { Systeminformation } from "systeminformation";

import { HttpAuthGuard } from "../httpAuth.guard";
import { Network } from "./entities/network.entity";
import { NetworkService } from "./network.service";

@Controller("network")
@UseGuards(HttpAuthGuard)
export class NetworkController {
  constructor(private readonly networkService: NetworkService) {}

  @Get()
  async findAll(): Promise<Network> {
    return await this.networkService.findAll();
  }

  @Get("connections")
  async findConnections(): Promise<Systeminformation.NetworkConnectionsData[]> {
    return await this.networkService.findConnections();
  }

  @Get("gatewayDefault")
  async findGatewayDefault(): Promise<string> {
    return await this.networkService.findGatewayDefault();
  }

  @Get("interfaceDefault")
  async findInterfaceDefault(): Promise<string> {
    return await this.networkService.findInterfaceDefault();
  }

  @Get("interfaces")
  async findInterfaces(): Promise<{
    [iface: string]: Systeminformation.NetworkInterfacesData;
  }> {
    return await this.networkService.findInterfaces();
  }

  @Get("stats")
  async findStats(): Promise<{
    [iface: string]: Systeminformation.NetworkStatsData;
  }> {
    return await this.networkService.findStats();
  }

  @Get()
  async findWifiConnections(): Promise<{
    [id: string]: Systeminformation.WifiConnectionData;
  }> {
    return await this.networkService.findWifiConnections();
  }

  @Get("wifiInterfaces")
  async findWifiInterfaces(): Promise<{
    [iface: string]: Systeminformation.WifiInterfaceData;
  }> {
    return await this.networkService.findWifiInterfaces();
  }

  @Get("wifiNetworks")
  async findWifiNetworks(): Promise<{
    [ssid: string]: Systeminformation.WifiNetworkData;
  }> {
    return await this.networkService.findWifiNetworks();
  }
}
