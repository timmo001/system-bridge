import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Setting } from "./entities/setting.entity";
import { SettingsController } from "./settings.controller";
import { SettingsService } from "./settings.service";

@Module({
  controllers: [SettingsController],
  providers: [SettingsService],
  imports: [TypeOrmModule.forFeature([Setting])],
  exports: [TypeOrmModule],
})
export class SettingsModule {}
