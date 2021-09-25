import { Injectable } from "@nestjs/common";
import { blockDevices, diskLayout, disksIO, fsSize } from "systeminformation";
import { join, sep } from "path";
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
import { lookup as mimeLookup } from "mime-types";

import { convertArrayToObject } from "../../common";
import {
  Filesystem,
  FilesystemItem,
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

  buildPath(path: string): string | undefined {
    const index = Object.keys(this.baseDirectories).findIndex(
      (baseDirectory: string) =>
        path.includes("/")
          ? baseDirectory === path.split("/")[0]
          : path.includes("\\")
          ? baseDirectory === path.split("\\")[0]
          : baseDirectory === path
    );

    if (index < 0) return undefined;

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

  async listFiles(path: string): Promise<Array<FilesystemItem>> {
    const { logger } = new Logger("FilesystemService");
    logger.info(`Listing files in ${path}`);
    logger.close();

    const files: Array<FilesystemItem> = [];

    for (const item of await readdir(path, { withFileTypes: true })) {
      const stats = item.isDirectory()
        ? undefined
        : await stat(join(path, item.name));

      const mimeType = item.isFile()
        ? mimeLookup(join(path, item.name))
        : undefined;

      files.push({
        name: item.name,
        created: stats?.birthtime,
        extension: item.name.split(".").pop(),
        isDirectory: item.isDirectory(),
        isFile: item.isFile(),
        isLink: item.isSymbolicLink(),
        lastAccessed: stats?.atime,
        lastModified: stats?.mtime,
        mimeType: mimeType ? mimeType : undefined,
        size: stats?.size,
      });
    }

    return files;
  }

  async getFileInfo(path: string): Promise<FilesystemItem | undefined> {
    const { logger } = new Logger("FilesystemService");
    logger.info(`Getting file info: ${path}`);
    logger.close();

    const dirInfo = path.split(sep).slice(0, -1).join(sep);

    return (await this.listFiles(dirInfo)).find((file: FilesystemItem) =>
      path.endsWith(file.name)
    );
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
