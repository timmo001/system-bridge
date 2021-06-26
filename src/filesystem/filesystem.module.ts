import { Module } from "@nestjs/common";
import { FilesystemService } from "./filesystem.service";
import { FilesystemController } from "./filesystem.controller";

@Module({
  controllers: [FilesystemController],
  providers: [FilesystemService],
})
export class FilesystemModule {}
