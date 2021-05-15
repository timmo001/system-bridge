import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Put,
} from "@nestjs/common";

import { SettingsService } from "./settings.service";
import { UpdateSettingsDto } from "./dto/update-settings.dto";
import { Setting, Settings } from "./entities/settings.entity";

@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async findAll(): Promise<Settings> {
    return await this.settingsService.findAll();
  }

  @Get(":section/:key")
  async find(
    @Param("section") section: string,
    @Param("key") key: string
  ): Promise<Setting> {
    const data = await this.settingsService.find(section, key);
    if (!data)
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: `Could not find ${key} in ${section}`,
        },
        HttpStatus.BAD_REQUEST
      );
    return data;
  }

  @Put(":section/:key")
  async update(
    @Param("section") section: string,
    @Param("key") key: string,
    @Body() updateSettingsDto: UpdateSettingsDto
  ): Promise<Setting> {
    await this.find(section, key);
    const data = await this.settingsService.update(
      section,
      key,
      updateSettingsDto
    );
    if (!data)
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: `Could not find ${key} in ${section}`,
        },
        HttpStatus.BAD_REQUEST
      );
    return data;
  }
}
