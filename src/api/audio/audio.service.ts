import { Injectable } from "@nestjs/common";
import loudness from "loudness";
import si from "systeminformation";

import { Audio } from "./entities/audio.entity";
import { UpdateAudioDto, UpdateAudioId } from "./dto/update-audio.dto";
import logger from "../../logger";

@Injectable()
export class AudioService {
  async findAll(): Promise<Audio> {
    let current = {
      muted: false,
      volume: -1,
    };
    try {
      current = {
        muted: await loudness.getMuted(),
        volume: await loudness.getVolume(),
      };
    } catch (e) {
      logger.info(`Cannot get audio from loudness module: ${e.message}`);
    }
    return {
      current,
      devices: await si.audio(),
    };
  }

  async update(
    id: UpdateAudioId,
    updateAudioDto: UpdateAudioDto
  ): Promise<Audio> {
    const currentVolume: number = await loudness.getVolume();
    switch (id) {
      default:
        break;
      case "mute":
        if (typeof updateAudioDto.value === "boolean")
          await loudness.setMuted(updateAudioDto.value);
        break;
      case "volume":
        if (typeof updateAudioDto.value === "number")
          await loudness.setVolume(updateAudioDto.value);
        break;
      case "volumeDown":
        if (typeof updateAudioDto.value === "number")
          await loudness.setVolume(currentVolume - updateAudioDto.value);
        else await loudness.setVolume(currentVolume - 5);
        break;
      case "volumeUp":
        if (typeof updateAudioDto.value === "number")
          await loudness.setVolume(currentVolume + updateAudioDto.value);
        else await loudness.setVolume(currentVolume + 5);
        break;
    }
    return this.findAll();
  }
}
