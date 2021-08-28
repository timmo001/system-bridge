import { Module } from "@nestjs/common";

import { BatteryController } from "./battery.controller";
import { BatteryService } from "./battery.service";
import { SettingsModule } from "../settings/settings.module";

@Module({
  controllers: [BatteryController],
  imports: [SettingsModule],
  providers: [BatteryService],
})
export class BatteryModule {}
