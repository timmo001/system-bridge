import { bluetoothDevices, osInfo, Systeminformation } from "systeminformation";
import { Injectable } from "@nestjs/common";
import fs from "fs";

import { Logger } from "../../logger";

const { logger } = new Logger("BluetoothService");

@Injectable()
export class BluetoothService {
  async findAll(): Promise<Array<Systeminformation.BluetoothDeviceData>> {
    try {
      if ((await osInfo()).platform === "linux")
        fs.accessSync(
          "/var/lib/bluetooth",
          fs.constants.F_OK | fs.constants.W_OK
        );
      return await bluetoothDevices();
    } catch (e) {
      logger.warn(`Error: ${e.message}`);
    }
    return [];
  }
}
