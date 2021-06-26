import { createWriteStream } from "fs";
import { Injectable } from "@nestjs/common";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import os from "os";

import { CreateMediaDto } from "./dto/create-media.dto";
import { DeleteMediaDto } from "./dto/delete-media.dto";
import { getConnection, getSettingsObject } from "../common";
import { UpdateMediaDto, UpdateMediaId } from "./dto/update-media.dto";
import { WebSocketConnection } from "../websocket";
import logger from "../logger";

@Injectable()
export class MediaService {
  async remove(): Promise<DeleteMediaDto> {
    const connection = await getConnection();
    const settings = await getSettingsObject(connection);
    await connection.close();

    const ws = new WebSocketConnection(
      Number(settings["network-wsPort"]) || 9172,
      settings["network-apiKey"],
      false,
      async () => {
        ws.sendEvent({ name: "player-stop" });
      }
    );
    return { successful: true };
  }

  async update(
    id: UpdateMediaId,
    updateMediaDto: UpdateMediaDto
  ): Promise<DeleteMediaDto> {
    const connection = await getConnection();
    const settings = await getSettingsObject(connection);
    await connection.close();

    const ws = new WebSocketConnection(
      Number(settings["network-wsPort"]) || 9172,
      settings["network-apiKey"],
      false,
      async () => {
        switch (id) {
          default:
            break;
          case "mute":
          case "pause":
          case "play":
          case "playpause":
          case "seek":
          case "stop":
          case "volume":
          case "volumeDown":
          case "volumeUp":
            ws.sendEvent({ name: `player-${id}`, data: updateMediaDto });
            break;
        }
        await ws.close();
      }
    );
    return { successful: true };
  }

  async create(createMediaDto: CreateMediaDto): Promise<CreateMediaDto> {
    (async () => {
      const connection = await getConnection();
      const settings = await getSettingsObject(connection);
      await connection.close();

      const ws = new WebSocketConnection(
        Number(settings["network-wsPort"]) || 9172,
        settings["network-apiKey"],
        false,
        async () => {
          ws.sendEvent({ name: "player-close" });

          if (createMediaDto.type === "audio")
            if (createMediaDto.url) {
              createMediaDto.path = join(
                process.env.APP_TEMP_PATH || os.tmpdir(),
                `/media-${uuidv4()}${createMediaDto.url.substr(
                  createMediaDto.url.lastIndexOf(".")
                )}`
              );
              logger.info(
                `Downloading: ${createMediaDto.url} to ${createMediaDto.path}`
              );
              const response = await axios.get(createMediaDto.url, {
                responseType: "stream",
              });
              const writer = createWriteStream(createMediaDto.path);
              response.data.pipe(writer);
              await new Promise((resolve, reject) => {
                writer.on("finish", resolve);
                writer.on("error", reject);
              });
            }
          if (createMediaDto.path) {
            ws.sendEvent({
              name: "player-open",
              data: {
                ...createMediaDto,
                url: `safe-file-protocol://${createMediaDto.path}`,
              },
            });
          } else if (createMediaDto.url) {
            ws.sendEvent({
              name: "player-open",
              data: createMediaDto,
            });
          }
          await ws.close();
        }
      );
    })();
    return createMediaDto;
  }
}
