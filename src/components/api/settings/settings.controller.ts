import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";

import { CreateSettingDto } from "./dto/create-setting.dto";
import { HttpAuthGuard } from "../httpAuth.guard";
import { Setting } from "./entities/setting.entity";
import { SettingsService } from "./settings.service";
import { UpdateSettingDto } from "./dto/update-setting.dto";

@Controller("settings")
@UseGuards(HttpAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Delete(":key")
  async remove(@Param("key") key: string): Promise<void> {
    await this.settingsService.remove(key);
  }

  @Get()
  async findAll(): Promise<Setting[]> {
    return await this.settingsService.findAll();
  }

  @Get(":key")
  async findOne(@Param("key") key: string): Promise<Setting> {
    const data = await this.settingsService.findOne(key);
    if (!data)
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: `Could not find ${key}`,
        },
        HttpStatus.BAD_REQUEST
      );
    return data;
  }

  @Post()
  async create(@Body() createSettingDto: CreateSettingDto): Promise<Setting> {
    if (await this.settingsService.findOne(createSettingDto.key))
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: `Record already exists for ${createSettingDto.key}`,
        },
        HttpStatus.BAD_REQUEST
      );
    return await this.settingsService.create(createSettingDto);
  }

  @Put(":key")
  async update(
    @Param("key") key: string,
    @Body() updateSettingDto: UpdateSettingDto
  ): Promise<Setting> {
    await this.findOne(key);
    return await this.settingsService.update(key, updateSettingDto);
  }
}
