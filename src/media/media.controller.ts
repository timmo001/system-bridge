import {
  Body,
  Controller,
  Delete,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
} from "@nestjs/common";
import fs from "fs";

import { CreateMediaDto } from "./dto/create-media.dto";
import { DeleteMediaDto } from "./dto/delete-media.dto";
import { MediaService } from "./media.service";
import { UpdateMediaDto, UpdateMediaId } from "./dto/update-media.dto";
import logger from "../logger";

@Controller("media")
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Delete()
  async remove(): Promise<DeleteMediaDto> {
    return await this.mediaService.remove();
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

  @Put(":id")
  async update(
    @Param("id") id: UpdateMediaId,
    @Body() updateMediaDto: UpdateMediaDto
  ): Promise<DeleteMediaDto> {
    if (
      id !== "mute" &&
      id !== "pause" &&
      id !== "play" &&
      id !== "playpause" &&
      id !== "seek" &&
      id !== "stop" &&
      id !== "volume" &&
      id !== "volumeDown" &&
      id !== "volumeUp"
    )
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: "You must provide a valid ID",
        },
        HttpStatus.BAD_REQUEST
      );

    if (id === "mute" && typeof updateMediaDto.value !== "boolean")
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: "ID mute requires a valid boolean value",
        },
        HttpStatus.BAD_REQUEST
      );

    if (
      (id === "seek" ||
        id === "volume" ||
        id === "volumeDown" ||
        id === "volumeUp") &&
      typeof updateMediaDto.value !== "number"
    )
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error:
            "ID seek, volume, volumeDown and volumeUp require a valid numeric value",
        },
        HttpStatus.BAD_REQUEST
      );

    return await this.mediaService.update(id, updateMediaDto);
  }
}
