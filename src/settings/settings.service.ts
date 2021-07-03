import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { CreateSettingDto } from "./dto/create-setting.dto";
import { Setting } from "./entities/setting.entity";
import { UpdateSettingDto } from "./dto/update-setting.dto";
import { WebSocketConnection } from "../websocket";

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private settingsRepository: Repository<Setting>
  ) {}

  async findAll(): Promise<Setting[]> {
    return this.settingsRepository.find();
  }

  async findOne(key: string): Promise<Setting> {
    return this.settingsRepository.findOne(key);
  }

  async create({ key, value }: CreateSettingDto): Promise<Setting> {
    await this.settingsRepository.insert({ key, value });
    return this.findOne(key);
  }

  async remove(key: string): Promise<void> {
    await this.settingsRepository.delete(key);
  }

  async update(key: string, { value }: UpdateSettingDto): Promise<Setting> {
    await this.settingsRepository.update(key, { value });
    if (key === "general-launchOnStartup")
      // eslint-disable-next-line no-var
      var ws = new WebSocketConnection(
        Number((await this.findOne("network-wsPort")).value) || 9172,
        (await this.findOne("network-apiKey")).value,
        false,
        () => ws.sendEvent({ name: "update-app-config" })
      );
    return await this.findOne(key);
  }
}
