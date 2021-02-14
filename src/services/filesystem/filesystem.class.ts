import si, { Systeminformation } from "systeminformation";

import { Application } from "../../declarations";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ServiceOptions {}

export interface FilesystemInfo {
  blockDevices: Systeminformation.BlockDevicesData[];
  diskLayout: Systeminformation.DiskLayoutData[];
  disksIO: Systeminformation.DisksIoData;
  fsSize: Systeminformation.FsSizeData[];
}

export class Filesystem {
  app: Application;
  options: ServiceOptions;

  constructor(options: ServiceOptions = {}, app: Application) {
    this.options = options;
    this.app = app;
  }

  async find(): Promise<FilesystemInfo> {
    return {
      blockDevices: await si.blockDevices(),
      diskLayout: await si.diskLayout(),
      disksIO: await si.disksIO(),
      fsSize: await si.fsSize(),
    };
  }
}
