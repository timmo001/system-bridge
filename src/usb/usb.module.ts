import { Module } from "@nestjs/common";
import { UsbService } from "./usb.service";
import { UsbController } from "./usb.controller";

@Module({
  controllers: [UsbController],
  providers: [UsbService],
})
export class UsbModule {}
