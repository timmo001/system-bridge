import { Module } from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { SettingsController } from "./settings.controller";

@Module({
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
