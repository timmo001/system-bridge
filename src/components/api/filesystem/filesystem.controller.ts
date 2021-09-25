import {
  Body,
  Controller,
  createParamDecorator,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Request,
  UseGuards,
} from "@nestjs/common";
import rawbody from "raw-body";

import {
  Filesystem,
  FilesystemUploadResponse,
} from "./entities/filesystem.entity";
import { FilesystemService } from "./filesystem.service";
import { HttpAuthGuard } from "../httpAuth.guard";

@Controller("filesystem")
@UseGuards(HttpAuthGuard)
export class FilesystemController {
  constructor(private readonly filesystemService: FilesystemService) {}

  @Get()
  async findAll(): Promise<Filesystem> {
    return await this.filesystemService.findAll();
  }

  @Post("file")
  async createFile(
    @Req() request,
    @Body() body: any
  ): Promise<FilesystemUploadResponse> {
    if (!request.headers["path"])
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: "You must provide a path header",
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

    const result = await this.filesystemService.createFile(
      request.headers["path"],
      data
    );

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
