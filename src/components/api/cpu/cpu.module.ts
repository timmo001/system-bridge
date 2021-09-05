import { Module } from "@nestjs/common";

import { CpuController } from "./cpu.controller";
import { CpuService } from "./cpu.service";
import { SettingsModule } from "../settings/settings.module";

@Module({
  controllers: [CpuController],
  imports: [SettingsModule],
  providers: [CpuService],
})
export class CpuModule {}
