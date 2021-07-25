import { Injectable } from "@nestjs/common";
import { audio } from "systeminformation";
import { audio as scAudio } from "system-control";

import { Audio } from "./entities/audio.entity";
import { UpdateAudioDto, UpdateAudioId } from "./dto/update-audio.dto";
import logger from "../logger";

@Injectable()
export class AudioService {
  async findAll(): Promise<Audio> {
    let current = {
      muted: false,
      volume: -1,
    };
    let devices;
    try {
      current = {
        muted: await scAudio.muted(),
        volume: await scAudio.volume(),
      };
    } catch (e) {
      logger.info(
        `Cannot get current audio from loudness module: ${e.message}`
      );
    }
    try {
      devices = await audio();
    } catch (e) {
      logger.info(
        `Cannot get audio devices from systeminformation module: ${e.message}`
      );
    }
    return { current, devices };
  }

  async update(
    id: UpdateAudioId,
    updateAudioDto: UpdateAudioDto
  ): Promise<Audio> {
    const currentVolume: number = await scAudio.volume();
    switch (id) {
      default:
        break;
      case "mute":
        if (typeof updateAudioDto.value === "boolean")
          await scAudio.muted(updateAudioDto.value);
        break;
      case "volume":
        if (typeof updateAudioDto.value === "number")
          await scAudio.volume(updateAudioDto.value);
        break;
      case "volumeDown":
        if (typeof updateAudioDto.value === "number")
          await scAudio.volume(currentVolume - updateAudioDto.value);
        else await scAudio.volume(currentVolume - 5);
        break;
      case "volumeUp":
        if (typeof updateAudioDto.value === "number")
          await scAudio.volume(currentVolume + updateAudioDto.value);
        else await scAudio.volume(currentVolume + 5);
        break;
    }
    return this.findAll();
  }
}
