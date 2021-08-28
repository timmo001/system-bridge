import { Module } from "@nestjs/common";

import { ProcessesController } from "./processes.controller";
import { ProcessesService } from "./processes.service";
import { SettingsModule } from "../settings/settings.module";

@Module({
  controllers: [ProcessesController],
  imports: [SettingsModule],
  providers: [ProcessesService],
})
export class ProcessesModule {}
