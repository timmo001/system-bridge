import { Module } from "@nestjs/common";

import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";
import { SettingsModule } from "../settings/settings.module";

@Module({
  controllers: [NotificationController],
  imports: [SettingsModule],
  providers: [NotificationService],
})
export class NotificationModule {}
