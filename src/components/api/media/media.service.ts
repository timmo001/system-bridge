import { Injectable } from "@nestjs/common";
import { tmpdir } from "os";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import fs from "fs";

import { AudioSource, Media, VideoSource } from "./entities/media.entity";
import { CreateMediaDto } from "./dto/create-media.dto";
import { DeleteMediaDto } from "./dto/delete-media.dto";
import { FindMediaId } from "./dto/find-media.dto";
import { getConnection, getSettingsObject } from "../..//common";
import { Logger } from "src/components/logger";
import { UpdateMediaDto, UpdateMediaId } from "./dto/update-media.dto";
import { WebSocketConnection } from "../../websocket";

@Injectable()
export class MediaService {
  // remove(): DeleteMediaDto {
  //   return { successful: closePlayerWindow() };
  // }

  // async findAll(): Promise<Media> {
  //   return (await getSetting("player-status")) as Media;
  // }

  // async find(
  //   id: FindMediaId,
  //   update?: boolean
  // ): Promise<string | AudioSource | VideoSource | undefined> {
  //   if (id === "cover") return getPlayerCover(update);
  //   const media = (await getSetting("player-status")) as Media;
  //   return media?.source;
  // }

  // async update(
  //   id: UpdateMediaId,
  //   updateMediaDto: UpdateMediaDto
  // ): Promise<DeleteMediaDto> {
  //   switch (id) {
  //     default:
  //       return { successful: false };
  //     case "mute":
  //       return {
  //         successful: mutePlayerWindow(updateMediaDto.value as boolean),
  //       };
  //     case "pause":
  //       return { successful: pausePlayerWindow() };
  //     case "play":
  //       return { successful: playPlayerWindow() };
  //     case "playpause":
  //       return { successful: playpausePlayerWindow() };
  //     case "seek":
  //       return { successful: seekPlayerWindow(updateMediaDto.value as number) };
  //     case "stop":
  //       return { successful: closePlayerWindow() };
  //     case "volume":
  //       return {
  //         successful: volumePlayerWindow(updateMediaDto.value as number),
  //       };
  //     case "volumeDown":
  //       return {
  //         successful: volumePlayerWindow(
  //           updateMediaDto.value as number,
  //           "down"
  //         ),
  //       };
  //     case "volumeUp":
  //       return {
  //         successful: volumePlayerWindow(updateMediaDto.value as number, "up"),
  //       };
  //   }
  // }

  create(createMediaDto: CreateMediaDto): CreateMediaDto {
    (async () => {
      const connection = await getConnection();
      const settings = await getSettingsObject(connection);
      await connection.close();

      const ws = new WebSocketConnection(
        Number(settings["network-wsPort"]) || 9172,
        settings["network-apiKey"],
        false,
        async () => {
          ws.sendEvent({ name: "gui-player-close" });
          if (createMediaDto.type === "audio")
            if (createMediaDto.path) {
              // setSetting("current-media-path", createMediaDto.path);
            } else if (createMediaDto.url) {
              createMediaDto.path = tmpdir() + `/media-${uuidv4()}`;
              const { logger } = new Logger("MediaService");
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
            ws.sendEvent({
              name: "gui-player-create",
              data: {
                ...createMediaDto,
                url: `file://${createMediaDto.path}`,
              },
            });
          } else if (createMediaDto.url) {
            ws.sendEvent({ name: "gui-player-create", data: createMediaDto });
          }
        }
      );
    })();
    return createMediaDto;
  }
}
