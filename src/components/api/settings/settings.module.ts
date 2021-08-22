import { Module } from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { SettingsController } from "./settings.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Setting } from "./entities/setting.entity";

@Module({
  controllers: [SettingsController],
  providers: [SettingsService],
  imports: [TypeOrmModule.forFeature([Setting])],
  exports: [TypeOrmModule],
})
export class SettingsModule {}
