import { Injectable } from "@nestjs/common";
import { Systeminformation, usb } from "systeminformation";

import { Usb } from "./entities/usb.entity";

@Injectable()
export class UsbService {
  async findAll(): Promise<Usb> {
    return {
      devices: await this.findUsbDevices(),
    };
  }

  async findUsbDevices(): Promise<Array<Systeminformation.UsbData>> {
    return await usb();
  }
}
