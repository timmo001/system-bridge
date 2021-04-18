import { app } from "electron";
import { Injectable } from "@nestjs/common";
import { resolve } from "path";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import fs from "fs";
import loudness from "loudness";
import si from "systeminformation";

import { CreateAudioDto } from "./dto/create-audio.dto";
import { DeleteAudioDto } from "./dto/delete-audio.dto";
import { UpdateAudioDto } from "./dto/update-audio.dto";
import { Audio } from "./entities/audio.entity";
import { MediaCreateData } from "../../types/media";
import { AudioUpdateId } from "./audio.controller";
import { setSetting } from "../../common";
import {
  closePlayerWindow,
  createPlayerWindow,
  pausePlayerWindow,
  playpausePlayerWindow,
  playPlayerWindow,
} from "../../player";
import logger from "../../logger";

@Injectable()
export class AudioService {
  remove(): DeleteAudioDto {
    return { successful: closePlayerWindow() };
  }

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
    id: AudioUpdateId,
    updateAudioDto: UpdateAudioDto
  ): Promise<Audio | DeleteAudioDto> {
    const currentVolume: number = await loudness.getVolume();
    switch (id) {
      default:
        break;
      case "mute":
        if (typeof updateAudioDto.value === "boolean")
          await loudness.setMuted(updateAudioDto.value);
        break;
      case "pause":
        return { successful: pausePlayerWindow() };
      case "play":
        return { successful: playPlayerWindow() };
      case "playpause":
        return { successful: playpausePlayerWindow() };
      case "stop":
        return { successful: closePlayerWindow() };
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

  async create(createAudioDto: CreateAudioDto): Promise<MediaCreateData> {
    const url = `/audio-${uuidv4()}`;

    (async () => {
      closePlayerWindow();
      if (createAudioDto.url) {
        createAudioDto.path = app.getPath("temp") + url;
        logger.info(`Downloading: ${createAudioDto.url}`);
        const response = await axios.get(createAudioDto.url, {
          responseType: "stream",
        });
        const writer = fs.createWriteStream(createAudioDto.path);
        response.data.pipe(writer);
        await new Promise((resolve, reject) => {
          writer.on("finish", resolve);
          writer.on("error", reject);
        });
      }

      if (createAudioDto.path) {
        logger.info(`URL: ${url}`);
        setSetting("current-audio-path", resolve(createAudioDto.path));

        createPlayerWindow({ ...createAudioDto, type: "audio", url });
      }
    })();

    return { ...createAudioDto, type: "audio", url };
  }
}
