import { Controller, Get, UseGuards } from "@nestjs/common";
import { Systeminformation } from "systeminformation";

import { HttpAuthGuard } from "../httpAuth.guard";
import { Usb } from "./entities/usb.entity";
import { UsbService } from "./usb.service";

@Controller("usb")
@UseGuards(HttpAuthGuard)
export class UsbController {
  constructor(private readonly usbService: UsbService) {}

  @Get()
  async findAll(): Promise<Usb> {
    return await this.usbService.findAll();
  }

  @Get("devices")
  async findUsbDevices(): Promise<Array<Systeminformation.UsbData>> {
    return await this.usbService.findUsbDevices();
  }
}
