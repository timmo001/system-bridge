import { Module } from "@nestjs/common";

import { DisplayController } from "./display.controller";
import { DisplayService } from "./display.service";
import { SettingsModule } from "../settings/settings.module";

@Module({
  controllers: [DisplayController],
  imports: [SettingsModule],
  providers: [DisplayService],
})
export class DisplayModule {}
