import { Module } from "@nestjs/common";

import { OsController } from "./os.controller";
import { OsService } from "./os.service";
import { SettingsModule } from "../settings/settings.module";

@Module({
  controllers: [OsController],
  imports: [SettingsModule],
  providers: [OsService],
})
export class OsModule {}
