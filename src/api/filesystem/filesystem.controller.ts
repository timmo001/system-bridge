import { Controller, Get } from "@nestjs/common";

import { Filesystem } from "./entities/filesystem.entity";
import { FilesystemService } from "./filesystem.service";

@Controller("filesystem")
export class FilesystemController {
  constructor(private readonly filesystemService: FilesystemService) {}

  @Get()
  async findAll(): Promise<Filesystem> {
    return await this.filesystemService.findAll();
  }
}
