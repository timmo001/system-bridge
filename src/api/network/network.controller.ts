import { Controller, Get } from "@nestjs/common";

import { Network } from "./entities/network.entity";
import { NetworkService } from "./network.service";

@Controller("network")
export class NetworkController {
  constructor(private readonly networkService: NetworkService) {}

  @Get()
  async findAll(): Promise<Network> {
    return await this.networkService.findAll();
  }
}
