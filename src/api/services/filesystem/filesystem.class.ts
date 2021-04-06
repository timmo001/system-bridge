import si, { Systeminformation } from "systeminformation";

import { Application } from "../../declarations";
import { convertArrayToObject } from "../../../common";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ServiceOptions {}

export interface FilesystemInfo {
  blockDevices: { [name: string]: Systeminformation.BlockDevicesData };
  diskLayout: { [device: string]: Systeminformation.DiskLayoutData };
  disksIO: Systeminformation.DisksIoData;
  fsSize: { [mount: string]: Systeminformation.FsSizeData };
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
      blockDevices: convertArrayToObject(await si.blockDevices(), "name"),
      diskLayout: convertArrayToObject(await si.diskLayout(), "device"),
      disksIO: await si.disksIO(),
      fsSize: convertArrayToObject(await si.fsSize(), "mount"),
    };
  }
}
