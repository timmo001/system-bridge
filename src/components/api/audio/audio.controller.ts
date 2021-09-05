import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Put,
  UseGuards,
} from "@nestjs/common";

import { Audio } from "./entities/audio.entity";
import { AudioService } from "./audio.service";
import { HttpAuthGuard } from "../httpAuth.guard";
import { UpdateAudioId, UpdateAudioDto } from "./dto/update-audio.dto";

@Controller("audio")
@UseGuards(HttpAuthGuard)
export class AudioController {
  constructor(private readonly audioService: AudioService) {}

  @Get()
  async findAll(): Promise<Audio> {
    return await this.audioService.findAll();
  }

  @Put(":id")
  async update(
    @Param("id") id: UpdateAudioId,
    @Body() updateAudioDto: UpdateAudioDto
  ): Promise<Audio> {
    if (
      id !== "mute" &&
      id !== "volume" &&
      id !== "volumeDown" &&
      id !== "volumeUp"
    )
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: "You must provide a valid id",
        },
        HttpStatus.BAD_REQUEST
      );

    return await this.audioService.update(id, updateAudioDto);
  }
}
