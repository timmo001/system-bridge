import { Controller, Get, UseGuards } from "@nestjs/common";
import { Systeminformation } from "systeminformation";

import { HttpAuthGuard } from "../httpAuth.guard";
import { Os } from "./entities/os.entity";
import { OsService } from "./os.service";

@Controller("os")
@UseGuards(HttpAuthGuard)
export class OsController {
  constructor(private readonly osService: OsService) {}

  @Get()
  async findAll(): Promise<Os> {
    return await this.osService.findAll();
  }

  @Get("info")
  async findOsInfo(): Promise<Systeminformation.OsData> {
    return await this.findOsInfo();
  }

  @Get("users")
  async findUsers(): Promise<Array<Systeminformation.UserData>> {
    return await this.findUsers();
  }
}
