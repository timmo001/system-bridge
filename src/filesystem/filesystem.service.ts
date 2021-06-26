import { Injectable } from "@nestjs/common";
import { blockDevices, diskLayout, disksIO, fsSize } from "systeminformation";

import { convertArrayToObject } from "../common";
import { Filesystem } from "./entities/filesystem.entity";

@Injectable()
export class FilesystemService {
  async findAll(): Promise<Filesystem> {
    return {
      blockDevices: convertArrayToObject(await blockDevices(), "name"),
      diskLayout: convertArrayToObject(await diskLayout(), "device"),
      disksIO: await disksIO(),
      fsSize: convertArrayToObject(await fsSize(), "mount"),
    };
  }
}
