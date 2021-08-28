import { Module } from "@nestjs/common";

import { GraphicsController } from "./graphics.controller";
import { GraphicsService } from "./graphics.service";
import { SettingsModule } from "../settings/settings.module";

@Module({
  controllers: [GraphicsController],
  imports: [SettingsModule],
  providers: [GraphicsService],
})
export class GraphicsModule {}
