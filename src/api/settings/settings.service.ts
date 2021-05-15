import { Injectable } from "@nestjs/common";

import { Configuration } from "../../configuration";
import { getSettings, setSetting } from "../../common";
import { Setting, Settings } from "./entities/settings.entity";
import { UpdateSettingsDto } from "./dto/update-settings.dto";

@Injectable()
export class SettingsService {
  async findAll(): Promise<Settings> {
    const s: Configuration = getSettings(),
      settings: Settings = [];
    Object.keys(s).forEach((section: string) => {
      Object.keys(s[section].items).forEach((key: string) => {
        settings.push({ section, key, ...s[section].items[key] });
      });
    });
    return settings;
  }

  async find(section: string, key: string): Promise<Setting | undefined> {
    const settings = await this.findAll();
    return settings.find(
      (s: Setting) => s.section === section && s.key === key
    );
  }

  async update(
    section: string,
    key: string,
    updateSettingsDto: UpdateSettingsDto
  ): Promise<Setting | undefined> {
    await setSetting(`${section}-items-${key}-value`, updateSettingsDto.value);
    return await this.find(section, key);
  }
}
