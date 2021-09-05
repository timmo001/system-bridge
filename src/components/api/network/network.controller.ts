import { Controller, Get, UseGuards } from "@nestjs/common";

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
}
