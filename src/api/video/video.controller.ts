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

import { CreateVideoDto } from "./dto/create-video.dto";
import { DeleteVideoDto } from "./dto/delete-video.dto";
import { MediaCreateData } from "../../types/media";
import { UpdateVideoId } from "./dto/update-video.dto";
import { VideoService } from "./video.service";
import logger from "../../logger";

@Controller("video")
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Delete()
  remove(): DeleteVideoDto {
    return this.videoService.remove();
  }

  @Put(":id")
  async update(@Param("id") id: UpdateVideoId): Promise<DeleteVideoDto> {
    return await this.videoService.update(id);
  }

  @Post()
  async create(
    @Body() createVideoDto: CreateVideoDto
  ): Promise<MediaCreateData> {
    if (!createVideoDto.path && !createVideoDto.url)
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: "You must provide a path or url",
        },
        HttpStatus.BAD_REQUEST
      );

    if (createVideoDto.path) {
      logger.info(`Path: ${createVideoDto.path}`);

      if (
        !(await new Promise<boolean>((resolve) => {
          if (createVideoDto.path)
            fs.access(
              createVideoDto.path,
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

    return await this.videoService.create(createVideoDto);
  }
}
