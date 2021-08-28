import { Module } from "@nestjs/common";

import { LogsController } from "./logs.controller";
import { LogsService } from "./logs.service";
import { SettingsModule } from "../settings/settings.module";

@Module({
  controllers: [LogsController],
  imports: [SettingsModule],
  providers: [LogsService],
})
export class LogsModule {}
