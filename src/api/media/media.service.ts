import { Injectable } from "@nestjs/common";

import { getSetting } from "../../common";

@Injectable()
export class MediaService {
  async findAll(): Promise<string> {
    return await getSetting("current-audio-path");
  }
}
