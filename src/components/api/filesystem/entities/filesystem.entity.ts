import { Systeminformation } from "systeminformation";

export interface Filesystem {
  blockDevices: { [name: string]: Systeminformation.BlockDevicesData };
  diskLayout: { [device: string]: Systeminformation.DiskLayoutData };
  disksIO: Systeminformation.DisksIoData;
  fsSize: { [mount: string]: Systeminformation.FsSizeData };
}

export interface FilesystemItem {
  name: string;
  created?: Date;
  extension?: string;
  isDirectory?: boolean;
  isFile?: boolean;
  isLink?: boolean;
  lastAccessed?: Date;
  lastModified?: Date;
  mimeType?: string;
  size?: number;
}

export interface FilesystemData {
  name: string;
  mimeType: string;
  readStream: any;
}

export interface FilesystemUploadResponse {
  success: boolean;
  message: string;
}
