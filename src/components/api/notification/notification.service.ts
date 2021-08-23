import { Injectable } from "@nestjs/common";
import notifier from "node-notifier";

import { CreateNotificationDto } from "./dto/create-notification.dto";
import { Logger } from "../../logger";

const { logger } = new Logger("NotificationService");

@Injectable()
export class NotificationService {
  async create(
    createNotificationDto: CreateNotificationDto
  ): Promise<CreateNotificationDto> {
    notifier.notify(
      createNotificationDto,
      (err: any, response: any, metadata: any) =>
        err &&
        logger.warn(`Error: ${JSON.stringify({ err, response, metadata })}`)
    );
    return createNotificationDto;
  }
}
