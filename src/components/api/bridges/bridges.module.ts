import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Bridge } from "./entities/bridges.entity";
import { BridgesController } from "./bridges.controller";
import { BridgesService } from "./bridges.service";
import { SettingsModule } from "../settings/settings.module";

@Module({
  controllers: [BridgesController],
  imports: [SettingsModule, TypeOrmModule.forFeature([Bridge])],
  providers: [BridgesService],
})
export class BridgesModule {}
