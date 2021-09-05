import { Controller, Get, UseGuards } from "@nestjs/common";

import { Filesystem } from "./entities/filesystem.entity";
import { FilesystemService } from "./filesystem.service";
import { HttpAuthGuard } from "../httpAuth.guard";

@Controller("filesystem")
@UseGuards(HttpAuthGuard)
export class FilesystemController {
  constructor(private readonly filesystemService: FilesystemService) {}

  @Get()
  async findAll(): Promise<Filesystem> {
    return await this.filesystemService.findAll();
  }
}
