import fs from "fs";
import si from "systeminformation";

import { Application } from "../../declarations";
import logger from "../../../logger";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ServiceOptions {}

export class Bluetooth {
  app: Application;
  options: ServiceOptions;

  constructor(options: ServiceOptions = {}, app: Application) {
    this.options = options;
    this.app = app;
  }

  // BUSTED: async find(): Promise<Systeminformation.BluetoothDeviceData> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async find(): Promise<any> {
    try {
      if ((await si.osInfo()).platform === "linux")
        fs.accessSync(
          "/var/lib/bluetooth",
          fs.constants.F_OK | fs.constants.W_OK
        );
      return await si.bluetoothDevices();
    } catch (e) {
      logger.warn(e);
    }
    return {};
  }
}
