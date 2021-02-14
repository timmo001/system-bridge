import si, { Systeminformation } from "systeminformation";

export interface FilesystemInfo {
  blockDevices: Systeminformation.BlockDevicesData[];
  diskLayout: Systeminformation.DiskLayoutData[];
  disksIO: Systeminformation.DisksIoData;
  fsSize: Systeminformation.FsSizeData[];
}

export default class FilesystemInfoService {
  async find(): Promise<FilesystemInfo> {
    return {
      blockDevices: await si.blockDevices(),
      diskLayout: await si.diskLayout(),
      disksIO: await si.disksIO(),
      fsSize: await si.fsSize(),
    };
  }
}
