import { Controller, Get, UseGuards } from "@nestjs/common";

import { BluetoothService } from "./bluetooth.service";
import { HttpAuthGuard } from "../httpAuth.guard";

@Controller("bluetooth")
@UseGuards(HttpAuthGuard)
export class BluetoothController {
  constructor(private readonly bluetoothService: BluetoothService) {}

  @Get()
  // BUSTED: async findAll(): Promise<Systeminformation.BluetoothDeviceData> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async findAll(): Promise<any> {
    return await this.bluetoothService.findAll();
  }
}
