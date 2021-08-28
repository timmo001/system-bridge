import { Module } from "@nestjs/common";

import { KeyboardController } from "./keyboard.controller";
import { KeyboardService } from "./keyboard.service";
import { SettingsModule } from "../settings/settings.module";

@Module({
  controllers: [KeyboardController],
  imports: [SettingsModule],
  providers: [KeyboardService],
})
export class KeyboardModule {}
