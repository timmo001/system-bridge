import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";

import { HttpAuthGuard } from "../httpAuth.guard";
import { Process, Processes } from "./entities/processes.entity";
import { ProcessesService } from "./processes.service";

@Controller("processes")
@UseGuards(HttpAuthGuard)
export class ProcessesController {
  constructor(private readonly processesService: ProcessesService) {}

  @Get()
  async findAll(): Promise<Processes> {
    return await this.processesService.findAll();
  }

  @Get(":name")
  async find(
    @Param("name") name: string,
    @Query("exact") exact = false
  ): Promise<Process[]> {
    const data = await this.processesService.find(name, exact);
    if (!data || data.length === 0)
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: `Could not process including the name: "${name}"`,
        },
        HttpStatus.BAD_REQUEST
      );
    return data;
  }
}
