import { Injectable } from "@nestjs/common";
import { audio } from "systeminformation";
import { getMuted, getVolume, setMuted, setVolume } from "loudness";

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
    try {
      current = {
        muted: await getMuted(),
        volume: await getVolume(),
      };
    } catch (e) {
      logger.info(`Cannot get audio from loudness module: ${e.message}`);
    }
    return {
      current,
      devices: await audio(),
    };
  }

  async update(
    id: UpdateAudioId,
    updateAudioDto: UpdateAudioDto
  ): Promise<Audio> {
    const currentVolume: number = await getVolume();
    switch (id) {
      default:
        break;
      case "mute":
        if (typeof updateAudioDto.value === "boolean")
          await setMuted(updateAudioDto.value);
        break;
      case "volume":
        if (typeof updateAudioDto.value === "number")
          await setVolume(updateAudioDto.value);
        break;
      case "volumeDown":
        if (typeof updateAudioDto.value === "number")
          await setVolume(currentVolume - updateAudioDto.value);
        else await setVolume(currentVolume - 5);
        break;
      case "volumeUp":
        if (typeof updateAudioDto.value === "number")
          await setVolume(currentVolume + updateAudioDto.value);
        else await setVolume(currentVolume + 5);
        break;
    }
    return this.findAll();
  }
}
