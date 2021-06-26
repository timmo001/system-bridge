import { Body, Controller, Post } from "@nestjs/common";

import { NotificationService } from "./notification.service";
import { CreateNotificationDto } from "./dto/create-notification.dto";

@Controller("notification")
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  async create(
    @Body() createNotificationDto: CreateNotificationDto
  ): Promise<CreateNotificationDto> {
    return await this.notificationService.create(createNotificationDto);
  }
}
