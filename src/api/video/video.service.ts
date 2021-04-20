import { Injectable } from "@nestjs/common";
import { resolve } from "path";
import { v4 as uuidv4 } from "uuid";

import { CreateVideoDto } from "./dto/create-video.dto";
import { DeleteVideoDto } from "./dto/delete-video.dto";
import { MediaCreateData } from "../../types/media";
import { setSetting } from "../../common";
import {
  closePlayerWindow,
  createPlayerWindow,
  pausePlayerWindow,
  playpausePlayerWindow,
  playPlayerWindow,
} from "../../player";
import { UpdateVideoId } from "./dto/update-video.dto";
import logger from "../../logger";

@Injectable()
export class VideoService {
  remove(): DeleteVideoDto {
    return { successful: closePlayerWindow() };
  }

  async update(id: UpdateVideoId): Promise<DeleteVideoDto> {
    switch (id) {
      default:
        break;
      case "pause":
        return { successful: pausePlayerWindow() };
      case "play":
        return { successful: playPlayerWindow() };
      case "playpause":
        return { successful: playpausePlayerWindow() };
      case "stop":
        return { successful: closePlayerWindow() };
    }
    return {
      successful: false,
    };
  }

  async create(createVideoDto: CreateVideoDto): Promise<MediaCreateData> {
    const url = `/video-${uuidv4()}`;

    if (createVideoDto.path) {
      logger.info(`Path: ${createVideoDto.path}`);

      logger.info(`URL: ${url}`);
      setSetting("current-video-path", resolve(createVideoDto.path));

      createPlayerWindow({ ...createVideoDto, type: "video", url });
    } else if (createVideoDto.url) {
      createPlayerWindow({
        ...createVideoDto,
        type: "video",
        url: createVideoDto.url,
      });
    }

    return { ...createVideoDto, type: "video", url };
  }
}
