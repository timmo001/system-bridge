import { Injectable } from "@nestjs/common";

import {
  closePlayerWindow,
  createPlayerWindow,
  pausePlayerWindow,
  playpausePlayerWindow,
  playPlayerWindow,
} from "../../player";
import { CreateVideoDto } from "./dto/create-video.dto";
import { DeleteVideoDto } from "./dto/delete-video.dto";
import { setSetting } from "../../common";
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

  async create(createVideoDto: CreateVideoDto): Promise<CreateVideoDto> {
    closePlayerWindow();
    if (createVideoDto.path) {
      logger.info(`Path: ${createVideoDto.path}`);
      setSetting("current-media-path", createVideoDto.path);
      createPlayerWindow({
        ...createVideoDto,
        type: "video",
        url: `safe-file-protocol://${createVideoDto.path}`,
      });
    } else if (createVideoDto.url) {
      createPlayerWindow({
        ...createVideoDto,
        type: "video",
        url: createVideoDto.url,
      });
    }
    return createVideoDto;
  }
}
