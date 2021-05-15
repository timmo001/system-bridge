import { Body, Controller, Get, Param, Put } from "@nestjs/common";

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
  ): Promise<Setting | undefined> {
    // if (section)
    //   if (key)
    //     throw new HttpException(
    //       {
    //         status: HttpStatus.BAD_REQUEST,
    //         error: "You must provide a valid ID",
    //       },
    //       HttpStatus.BAD_REQUEST
    //     );

    return await this.settingsService.find(section, key);
  }

  @Put(":section/:key")
  async update(
    @Param("section") section: string,
    @Param("key") key: string,
    @Body() updateSettingsDto: UpdateSettingsDto
  ): Promise<Setting | undefined> {
    // if (id)
    //   throw new HttpException(
    //     {
    //       status: HttpStatus.BAD_REQUEST,
    //       error: "You must provide a valid ID",
    //     },
    //     HttpStatus.BAD_REQUEST
    //   );

    return await this.settingsService.update(section, key, updateSettingsDto);
  }
}
