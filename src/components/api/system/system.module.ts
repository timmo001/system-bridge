import { Module } from "@nestjs/common";

import { SettingsModule } from "../settings/settings.module";
import { SystemController } from "./system.controller";
import { SystemService } from "./system.service";

@Module({
  controllers: [SystemController],
  imports: [SettingsModule],
  providers: [SystemService],
})
export class SystemModule {}
