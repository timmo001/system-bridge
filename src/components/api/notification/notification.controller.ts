import { Body, Controller, Post, UseGuards } from "@nestjs/common";

import { CreateNotificationDto } from "./dto/create-notification.dto";
import { HttpAuthGuard } from "../httpAuth.guard";
import { NotificationService } from "./notification.service";

@Controller("notification")
@UseGuards(HttpAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  async create(
    @Body() createNotificationDto: CreateNotificationDto
  ): Promise<CreateNotificationDto> {
    return await this.notificationService.create(createNotificationDto);
  }
}
