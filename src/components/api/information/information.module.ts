import { Module } from "@nestjs/common";

import { InformationController } from "./information.controller";
import { InformationService } from "./information.service";
import { SettingsModule } from "../settings/settings.module";

@Module({
  controllers: [InformationController],
  imports: [SettingsModule],
  providers: [InformationService],
})
export class InformationModule {}
