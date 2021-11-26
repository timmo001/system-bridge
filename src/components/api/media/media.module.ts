import { Module } from "@nestjs/common";

import { MediaController } from "./media.controller";
import { MediaService } from "./media.service";
import { SettingsModule } from "../settings/settings.module";

@Module({
  controllers: [MediaController],
  imports: [SettingsModule],
  providers: [MediaService],
})
export class MediaModule {}
