import { Controller, Get } from "@nestjs/common";

import { BluetoothService } from "./bluetooth.service";

@Controller("bluetooth")
export class BluetoothController {
  constructor(private readonly bluetoothService: BluetoothService) {}

  @Get()
  // BUSTED: async findAll(): Promise<Systeminformation.BluetoothDeviceData> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async findAll(): Promise<any> {
    return await this.bluetoothService.findAll();
  }
}
