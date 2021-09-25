import { Injectable } from "@nestjs/common";
import { blockDevices, diskLayout, disksIO, fsSize } from "systeminformation";
import { writeFile } from "fs/promises";

import { convertArrayToObject } from "../../common";
import {
  Filesystem,
  FilesystemUploadResponse,
} from "./entities/filesystem.entity";
import { Logger } from "../../logger";

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

  async createFile(
    path: string,
    fileData: string | Buffer
  ): Promise<FilesystemUploadResponse> {
    const { logger } = new Logger("FilesystemService");
    logger.info(`Uploading file to ${path}`);
    try {
      await writeFile(path, fileData, { encoding: "utf8" });
      return {
        success: true,
        message: "File uploaded successfully",
      };
    } catch (err) {
      return {
        success: false,
        message: err.message,
      };
    }
  }
}
