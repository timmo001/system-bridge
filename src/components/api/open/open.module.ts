import { Module } from "@nestjs/common";

import { OpenController } from "./open.controller";
import { OpenService } from "./open.service";
import { SettingsModule } from "../settings/settings.module";

@Module({
  controllers: [OpenController],
  imports: [SettingsModule],
  providers: [OpenService],
})
export class OpenModule {}
