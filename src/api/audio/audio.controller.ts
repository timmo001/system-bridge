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

import { Audio } from "./entities/audio.entity";
import { AudioService } from "./audio.service";
import { CreateAudioDto } from "./dto/create-audio.dto";
import { DeleteAudioDto } from "./dto/delete-audio.dto";
import { UpdateAudioId, UpdateAudioDto } from "./dto/update-audio.dto";
import logger from "../../logger";

@Controller("audio")
export class AudioController {
  constructor(private readonly audioService: AudioService) {}

  @Delete()
  remove(): DeleteAudioDto {
    return this.audioService.remove();
  }

  @Get()
  async findAll(): Promise<Audio> {
    return await this.audioService.findAll();
  }

  @Put(":id")
  async update(
    @Param("id") id: UpdateAudioId,
    @Body() updateAudioDto: UpdateAudioDto
  ): Promise<Audio | DeleteAudioDto> {
    return await this.audioService.update(id, updateAudioDto);
  }

  @Post()
  async create(
    @Body() createAudioDto: CreateAudioDto
  ): Promise<CreateAudioDto> {
    if (!createAudioDto.path && !createAudioDto.url)
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: "You must provide a path or url",
        },
        HttpStatus.BAD_REQUEST
      );

    if (createAudioDto.path) {
      logger.info(`Path: ${createAudioDto.path}`);

      if (
        !(await new Promise<boolean>((resolve) => {
          if (createAudioDto.path)
            fs.access(
              createAudioDto.path,
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

    return await this.audioService.create(createAudioDto);
  }
}
