import { Injectable } from "@nestjs/common";
import { nativeImage, Notification as ElectronNotification } from "electron";

import { CreateNotificationDto } from "./dto/create-notification.dto";

@Injectable()
export class NotificationService {
  async create(
    createNotificationDto: CreateNotificationDto
  ): Promise<CreateNotificationDto> {
    if (
      createNotificationDto.icon &&
      typeof createNotificationDto.icon === "string" &&
      createNotificationDto.icon.includes("base64")
    )
      createNotificationDto.icon = nativeImage.createFromDataURL(
        createNotificationDto.icon
      );
    const notification = new ElectronNotification(createNotificationDto);
    notification.show();
    return createNotificationDto;
  }
}
