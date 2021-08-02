import { Systeminformation } from "systeminformation";

export interface Filesystem {
  blockDevices: { [name: string]: Systeminformation.BlockDevicesData };
  diskLayout: { [device: string]: Systeminformation.DiskLayoutData };
  disksIO: Systeminformation.DisksIoData;
  fsSize: { [mount: string]: Systeminformation.FsSizeData };
}
