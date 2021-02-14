import si from "systeminformation";

import { Application } from "../../declarations";

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
    return await si.bluetoothDevices();
  }
}
