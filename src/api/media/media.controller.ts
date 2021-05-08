import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
} from "@nestjs/common";
import fs from "fs";

import { Media } from "./entities/media.entity";
import { MediaService } from "./media.service";
import { CreateMediaDto } from "./dto/create-media.dto";
import { DeleteMediaDto } from "./dto/delete-media.dto";
import { UpdateMediaId } from "./dto/update-media.dto";
import logger from "../../logger";

@Controller("media")
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Delete()
  remove(): DeleteMediaDto {
    return this.mediaService.remove();
  }

  @Get()
  async findAll(): Promise<Media> {
    return await this.mediaService.findAll();
  }

  @Put(":id")
  async update(
    @Param("id") id: UpdateMediaId
  ): Promise<Media | DeleteMediaDto> {
    if (id !== "pause" && id !== "play" && id !== "playpause" && id !== "stop")
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: "You must provide a valid id",
        },
        HttpStatus.BAD_REQUEST
      );

    return await this.mediaService.update(id);
  }

  @Post()
  async create(
    @Body() createMediaDto: CreateMediaDto
  ): Promise<CreateMediaDto> {
    if (createMediaDto.type !== "audio" && createMediaDto.type !== "video")
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: "You must provide a valid media type",
        },
        HttpStatus.BAD_REQUEST
      );

    if (!createMediaDto.path && !createMediaDto.url)
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: "You must provide a path or url",
        },
        HttpStatus.BAD_REQUEST
      );

    if (createMediaDto.path) {
      logger.info(`Path: ${createMediaDto.path}`);

      if (
        !(await new Promise<boolean>((resolve) => {
          if (createMediaDto.path)
            fs.access(
              createMediaDto.path,
              (err: NodeJS.ErrnoException | null) => resolve(err ? false : true)
            );
        }))
      )
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: "Path provided does not exist",
          },
          HttpStatus.BAD_REQUEST
        );
    }

    return await this.mediaService.create(createMediaDto);
  }
}
