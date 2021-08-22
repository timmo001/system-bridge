import { Notification } from "node-notifier";

export interface CreateNotificationDto extends Notification {
  [key: string]: any;
}
