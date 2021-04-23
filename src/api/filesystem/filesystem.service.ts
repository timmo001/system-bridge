import { Injectable } from "@nestjs/common";
import si from "systeminformation";

import { convertArrayToObject } from "../../common";
import { Filesystem } from "./entities/filesystem.entity";

@Injectable()
export class FilesystemService {
  async findAll(): Promise<Filesystem> {
    return {
      blockDevices: convertArrayToObject(await si.blockDevices(), "name"),
      diskLayout: convertArrayToObject(await si.diskLayout(), "device"),
      disksIO: await si.disksIO(),
      fsSize: convertArrayToObject(await si.fsSize(), "mount"),
    };
  }
}
