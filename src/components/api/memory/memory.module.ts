import { Module } from "@nestjs/common";

import { MemoryController } from "./memory.controller";
import { MemoryService } from "./memory.service";
import { SettingsModule } from "../settings/settings.module";

@Module({
  controllers: [MemoryController],
  imports: [SettingsModule],
  providers: [MemoryService],
})
export class MemoryModule {}
