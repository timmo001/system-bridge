import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import rawbody from "raw-body";

import {
  Filesystem,
  FilesystemItem,
  FilesystemUploadResponse,
} from "./entities/filesystem.entity";
import { FilesystemService } from "./filesystem.service";
import { HttpAuthGuard } from "../httpAuth.guard";
import { createReadStream } from "fs";
import { Systeminformation } from "systeminformation";

@Controller("filesystem")
@UseGuards(HttpAuthGuard)
export class FilesystemController {
  constructor(private readonly filesystemService: FilesystemService) {}

  @Get()
  async findAll(): Promise<Filesystem> {
    return await this.filesystemService.findAll();
  }

  @Get("blockDevices")
  async findBlockDevices(): Promise<{
    [name: string]: Systeminformation.BlockDevicesData;
  }> {
    return await this.filesystemService.findBlockDevices();
  }

  @Get("layout")
  async findDisksLayout(): Promise<{
    [device: string]: Systeminformation.DiskLayoutData;
  }> {
    return await this.filesystemService.findDisksLayout();
  }

  @Get("io")
  async findDisksIO(): Promise<Systeminformation.DisksIoData> {
    return await this.filesystemService.findDisksIO();
  }

  @Get("size")
  async findSizes(): Promise<{
    [mount: string]: Systeminformation.FsSizeData;
  }> {
    return await this.filesystemService.findSizes();
  }

  @Get("files")
  async listFiles(@Query("path") path: string): Promise<Array<FilesystemItem>> {
    if (!path || typeof path !== "string")
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: "You must provide a path",
        },
        HttpStatus.BAD_REQUEST
      );

    path = this.filesystemService.buildPath(path);

    if (
      !path ||
      typeof path !== "string" ||
      !this.filesystemService.checkPathExists(path) ||
      !(await this.filesystemService.checkPathIsDirectory(path))
    )
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: "Path is not valid",
        },
        HttpStatus.BAD_REQUEST
      );

    return await this.filesystemService.listFiles(path);
  }

  @Get("files/file")
  async getFileInfo(
    @Query("path") path: string
  ): Promise<FilesystemItem | null> {
    if (!path || typeof path !== "string")
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: "You must provide a path",
        },
        HttpStatus.BAD_REQUEST
      );

    path = this.filesystemService.buildPath(path);

    if (
      !path ||
      typeof path !== "string" ||
      !this.filesystemService.checkPathExists(path) ||
      (await this.filesystemService.checkPathIsDirectory(path))
    )
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: "Path is not valid",
        },
        HttpStatus.BAD_REQUEST
      );

    return await this.filesystemService.getFileInfo(path);
  }

  @Get("files/file/data")
  async getFileData(
    @Query("path") path: string,
    @Res({ passthrough: true }) response: Response
  ): Promise<StreamableFile> {
    if (!path || typeof path !== "string")
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: "You must provide a path",
        },
        HttpStatus.BAD_REQUEST
      );

    path = this.filesystemService.buildPath(path);

    if (
      !path ||
      typeof path !== "string" ||
      !this.filesystemService.checkPathExists(path) ||
      (await this.filesystemService.checkPathIsDirectory(path))
    )
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: "Path is not valid",
        },
        HttpStatus.BAD_REQUEST
      );

    const info = await this.filesystemService.getFileInfo(path);

    response.set({
      "Content-Type": info.mimeType,
      "Content-Disposition": `attachment; filename="${info.name}"`,
    });

    const file = createReadStream(path);
    return new StreamableFile(file);
  }

  @Post("files/file")
  async createFile(
    @Req() request: Request,
    @Query("path") path: string,
    @Body() body: any
  ): Promise<FilesystemUploadResponse> {
    if (!path || typeof path !== "string")
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: "You must provide a path",
        },
        HttpStatus.BAD_REQUEST
      );

    path = this.filesystemService.buildPath(path);

    if (!path || typeof path !== "string")
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: "Path is not valid",
        },
        HttpStatus.BAD_REQUEST
      );

    let data: any;
    switch (request.headers["content-type"]) {
      case "application/json":
        data = JSON.stringify(body);
        break;
      default:
        data = request.readable ? await rawbody(request) : body;
        break;
    }

    if (!data)
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: `Couldn't find data from provided Content-Type: ${request.headers["content-type"]}`,
        },
        HttpStatus.BAD_REQUEST
      );

    const result = await this.filesystemService.createFile(path, data);

    if (!result.success)
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: result.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );

    return result;
  }
}
