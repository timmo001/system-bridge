import { Injectable } from "@nestjs/common";
import { audio, Systeminformation } from "systeminformation";

import { Audio, AudioCurrent } from "./entities/audio.entity";
import { getCurrent, muted, volume } from "./data";
import { Logger } from "../../logger";
import { UpdateAudioDto, UpdateAudioId } from "./dto/update-audio.dto";

const { logger } = new Logger("AudioService");

@Injectable()
export class AudioService {
  async findAll(): Promise<Audio> {
    return {
      current: await this.findCurrent(),
      devices: await this.findDevices(),
    };
  }

  async findCurrent(): Promise<AudioCurrent | null> {
    try {
      return await getCurrent();
    } catch (e) {
      logger.warn(`Cannot get current audio: ${e.message}`);
    }
    return null;
  }

  async findDevices(): Promise<Array<Systeminformation.AudioData> | null> {
    try {
      return await audio();
    } catch (e) {
      logger.warn(`Cannot get audio devices: ${e.message}`);
    }
    return null;
  }

  async update(
    id: UpdateAudioId,
    updateAudioDto: UpdateAudioDto
  ): Promise<Audio> {
    const currentVolume: number = await volume();
    switch (id) {
      default:
        break;
      case "mute":
        if (typeof updateAudioDto.value === "boolean")
          await muted(updateAudioDto.value);
        break;
      case "volume":
        if (typeof updateAudioDto.value === "number")
          await volume(updateAudioDto.value);
        break;
      case "volumeDown":
        if (typeof updateAudioDto.value === "number")
          await volume(currentVolume - updateAudioDto.value);
        else await volume(currentVolume - 5);
        break;
      case "volumeUp":
        if (typeof updateAudioDto.value === "number")
          await volume(currentVolume + updateAudioDto.value);
        else await volume(currentVolume + 5);
        break;
    }
    return this.findAll();
  }
}
