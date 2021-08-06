import { bluetoothDevices, osInfo } from "systeminformation";
import { Injectable } from "@nestjs/common";
import fs from "fs";

import logger from "../../logger";

@Injectable()
export class BluetoothService {
  // BUSTED: async findAll(): Promise<Systeminformation.BluetoothDeviceData> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async findAll(): Promise<any> {
    try {
      if ((await osInfo()).platform === "linux")
        fs.accessSync(
          "/var/lib/bluetooth",
          fs.constants.F_OK | fs.constants.W_OK
        );
      return await bluetoothDevices();
    } catch (e) {
      logger.warn(e);
    }
    return {};
  }
}
