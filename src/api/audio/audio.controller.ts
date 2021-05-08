import { Body, Controller, Get, Param, Put } from "@nestjs/common";

import { Audio } from "./entities/audio.entity";
import { AudioService } from "./audio.service";
import { UpdateAudioId, UpdateAudioDto } from "./dto/update-audio.dto";

@Controller("audio")
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
    return await this.audioService.update(id, updateAudioDto);
  }
}
