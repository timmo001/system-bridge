import { app } from "electron";
import { Injectable } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import fs from "fs";

import {
  closePlayerWindow,
  createPlayerWindow,
  mutePlayerWindow,
  pausePlayerWindow,
  playpausePlayerWindow,
  playPlayerWindow,
  volumePlayerWindow,
} from "../../player";
import { Media } from "./entities/media.entity";
import { CreateMediaDto } from "./dto/create-media.dto";
import { DeleteMediaDto } from "./dto/delete-media.dto";
import { getSetting, setSetting } from "../../common";
import { UpdateMediaDto, UpdateMediaId } from "./dto/update-media.dto";
import logger from "../../logger";

@Injectable()
export class MediaService {
  remove(): DeleteMediaDto {
    return { successful: closePlayerWindow() };
  }

  async findAll(): Promise<Media> {
    return (await getSetting("player-status")) as Media;
  }

  async update(
    id: UpdateMediaId,
    updateMediaDto: UpdateMediaDto
  ): Promise<DeleteMediaDto> {
    switch (id) {
      default:
        return { successful: false };
      case "pause":
        return { successful: pausePlayerWindow() };
      case "play":
        return { successful: playPlayerWindow() };
      case "playpause":
        return { successful: playpausePlayerWindow() };
      case "stop":
        return { successful: closePlayerWindow() };
      case "mute":
        return {
          successful: mutePlayerWindow(updateMediaDto.value as boolean),
        };
      case "volume":
        return {
          successful: volumePlayerWindow(updateMediaDto.value as number),
        };
      case "volumeDown":
        return {
          successful: volumePlayerWindow(
            updateMediaDto.value as number,
            "down"
          ),
        };
      case "volumeUp":
        return {
          successful: volumePlayerWindow(updateMediaDto.value as number, "up"),
        };
    }
  }

  async create(createMediaDto: CreateMediaDto): Promise<CreateMediaDto> {
    (async () => {
      closePlayerWindow();
      if (createMediaDto.type === "audio")
        if (createMediaDto.path) {
          setSetting("current-media-path", createMediaDto.path);
        } else if (createMediaDto.url) {
          createMediaDto.path = app.getPath("temp") + `/media-${uuidv4()}`;
          logger.info(`Downloading: ${createMediaDto.url}`);
          const response = await axios.get(createMediaDto.url, {
            responseType: "stream",
          });
          const writer = fs.createWriteStream(createMediaDto.path);
          response.data.pipe(writer);
          await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
          });
        }
      if (createMediaDto.path) {
        createPlayerWindow({
          ...createMediaDto,
          url: `safe-file-protocol://${createMediaDto.path}`,
        });
      } else if (createMediaDto.url) {
        createPlayerWindow(createMediaDto);
      }
    })();
    return createMediaDto;
  }
}
