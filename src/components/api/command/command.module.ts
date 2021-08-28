import { Module } from "@nestjs/common";

import { CommandController } from "./command.controller";
import { CommandService } from "./command.service";
import { SettingsModule } from "../settings/settings.module";

@Module({
  controllers: [CommandController],
  imports: [SettingsModule],
  providers: [CommandService],
})
export class CommandModule {}
