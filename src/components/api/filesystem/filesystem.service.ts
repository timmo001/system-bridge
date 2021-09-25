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
    relativePathFromHome: string,
    fileData: string | Buffer
  ): Promise<FilesystemUploadResponse> {
    const path = join(homedir(), relativePathFromHome);

    const { logger } = new Logger("FilesystemService");
    logger.info(`Uploading file to ${path}`);
    try {
      await writeFile(path, fileData, { encoding: "utf8" });
      logger.close();
      return {
        success: true,
        message: "File uploaded successfully",
      };
    } catch (err) {
      logger.warn(`Error uploading file to ${path} - ${err.message}`);
      logger.close();
      return {
        success: false,
        message: err.message,
      };
    }
  }
}
