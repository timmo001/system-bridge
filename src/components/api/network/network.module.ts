import { Module } from "@nestjs/common";

import { NetworkController } from "./network.controller";
import { NetworkService } from "./network.service";
import { SettingsModule } from "../settings/settings.module";

@Module({
  controllers: [NetworkController],
  imports: [SettingsModule],
  providers: [NetworkService],
})
export class NetworkModule {}
