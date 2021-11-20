import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";

import { HttpAuthGuard } from "../httpAuth.guard";
import { BridgesService } from "./bridges.service";
import { Bridge } from "./entities/bridges.entity";

@Controller("bridges")
@UseGuards(HttpAuthGuard)
export class BridgesController {
  constructor(private readonly bridgesService: BridgesService) {}

  @Delete(":key")
  async remove(@Param("key") key: string): Promise<void> {
    await this.bridgesService.remove(key);
  }

  @Get()
  async findAll(): Promise<Array<Bridge>> {
    return await this.bridgesService.findAll();
  }

  @Get(":key")
  async findOne(@Param("key") key: string): Promise<Bridge> {
    return await this.bridgesService.findOne(key);
  }

  @Post()
  async create(@Body() bridge: Bridge): Promise<Bridge> {
    return await this.bridgesService.create(bridge);
  }

  @Put(":key")
  async update(
    @Param("key") key: string,
    @Body() bridge: Bridge
  ): Promise<Bridge> {
    return await this.bridgesService.update(key, bridge);
  }
}
