import { Controller, Get } from "@nestjs/common";

import { Usb } from "./entities/usb.entity";
import { UsbService } from "./usb.service";

@Controller("usb")
export class UsbController {
  constructor(private readonly usbService: UsbService) {}

  @Get()
  async findAll(): Promise<Usb> {
    return await this.usbService.findAll();
  }
}
