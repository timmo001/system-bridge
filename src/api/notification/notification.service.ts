import { Injectable } from "@nestjs/common";
import notifier from "node-notifier";

import { CreateNotificationDto } from "./dto/create-notification.dto";
import logger from "../../logger";

@Injectable()
export class NotificationService {
  async create(
    createNotificationDto: CreateNotificationDto
  ): Promise<CreateNotificationDto> {
    notifier.notify(
      createNotificationDto,
      (err: any, response: any, metadata: any) =>
        err
          ? logger.warn(
              `Error: ${JSON.stringify({ err, response, metadata })}`
            )
          : logger.info(`${JSON.stringify({ response, metadata })}`)
    );
    return createNotificationDto;
  }
}
