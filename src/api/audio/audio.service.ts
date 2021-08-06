import { Injectable } from "@nestjs/common";
import { audio, Systeminformation } from "systeminformation";

import { Audio } from "./entities/audio.entity";
import { UpdateAudioDto, UpdateAudioId } from "./dto/update-audio.dto";
import logger from "../../logger";
import { getCurrent, muted, volume } from "./data";

@Injectable()
export class AudioService {
  async findAll(): Promise<Audio> {
    let devices: Systeminformation.AudioData[] = [];
    try {
      devices = await audio();
    } catch (e) {
      logger.warning(`Cannot get audio devices: ${e.message}`);
    }
    return { current: await getCurrent(), devices };
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
