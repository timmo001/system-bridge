import { Module } from "@nestjs/common";

import { BluetoothController } from "./bluetooth.controller";
import { BluetoothService } from "./bluetooth.service";
import { SettingsModule } from "../settings/settings.module";

@Module({
  controllers: [BluetoothController],
  imports: [SettingsModule],
  providers: [BluetoothService],
})
export class BluetoothModule {}
