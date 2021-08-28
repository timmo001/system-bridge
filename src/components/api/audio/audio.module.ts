import { Module } from "@nestjs/common";

import { AudioController } from "./audio.controller";
import { AudioService } from "./audio.service";
import { SettingsModule } from "../settings/settings.module";

@Module({
  controllers: [AudioController],
  imports: [SettingsModule],
  providers: [AudioService],
})
export class AudioModule {}
