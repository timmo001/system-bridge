import { Module } from "@nestjs/common";

import { FilesystemController } from "./filesystem.controller";
import { FilesystemService } from "./filesystem.service";
import { SettingsModule } from "../settings/settings.module";

@Module({
  controllers: [FilesystemController],
  imports: [SettingsModule],
  providers: [FilesystemService],
})
export class FilesystemModule {}
