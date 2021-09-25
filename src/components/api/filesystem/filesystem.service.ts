import { Injectable } from "@nestjs/common";
import { blockDevices, diskLayout, disksIO, fsSize } from "systeminformation";
import { join } from "path";
import { readdir, stat, writeFile } from "fs/promises";
import { existsSync } from "fs";
import {
  getDesktopFolder,
  getDocumentsFolder,
  getDownloadsFolder,
  getHomeFolder,
  getMusicFolder,
  getPicturesFolder,
  getVideosFolder,
} from "platform-folders";

import { convertArrayToObject } from "../../common";
import {
  Filesystem,
  FilesystemUploadResponse,
} from "./entities/filesystem.entity";
import { Logger } from "../../logger";

@Injectable()
export class FilesystemService {
  baseDirectories = {
    desktop: getDesktopFolder(),
    documents: getDocumentsFolder(),
    downloads: getDownloadsFolder(),
    home: getHomeFolder(),
    music: getMusicFolder(),
    pictures: getPicturesFolder(),
    videos: getVideosFolder(),
  };

  buildPath(path: string): string | null {
    const index = Object.keys(this.baseDirectories).findIndex(
      (baseDirectory: string) =>
        path.includes("/")
          ? baseDirectory === path.split("/")[0]
          : baseDirectory === path
    );

    if (!index) return null;

    return join(
      Object.values(this.baseDirectories)[index],
      path.replace(Object.keys(this.baseDirectories)[index], "")
    );
  }

  checkPathExists(path: string): boolean {
    return existsSync(path);
  }

  async checkPathIsDirectory(path: string): Promise<boolean> {
    return (await stat(path)).isDirectory();
  }

  async findAll(): Promise<Filesystem> {
    return {
      blockDevices: convertArrayToObject(await blockDevices(), "name"),
      diskLayout: convertArrayToObject(await diskLayout(), "device"),
      disksIO: await disksIO(),
      fsSize: convertArrayToObject(await fsSize(), "mount"),
    };
  }

  async listFiles(path: string): Promise<string[]> {
    const { logger } = new Logger("FilesystemService");
    logger.info(`Listing files in ${path}`);
    logger.close();

    return await readdir(path);
  }

  async createFile(
    path: string,
    fileData: string | Buffer
  ): Promise<FilesystemUploadResponse> {
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
