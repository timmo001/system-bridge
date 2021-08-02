import { Injectable } from "@nestjs/common";
import { usb } from "systeminformation";

import { Usb } from "./entities/usb.entity";

@Injectable()
export class UsbService {
  async findAll(): Promise<Usb> {
    return {
      devices: await usb(),
    };
  }
}
