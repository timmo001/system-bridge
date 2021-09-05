import { Module } from "@nestjs/common";

import { SettingsModule } from "../settings/settings.module";
import { UsbController } from "./usb.controller";
import { UsbService } from "./usb.service";

@Module({
  controllers: [UsbController],
  imports: [SettingsModule],
  providers: [UsbService],
})
export class UsbModule {}
