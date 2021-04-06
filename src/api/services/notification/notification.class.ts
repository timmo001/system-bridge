import { nativeImage, Notification as ElectronNotification } from "electron";
import { Application } from "../../declarations";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ServiceOptions {}

export interface NotificationInfo {
  status: boolean;
}

export class Notification {
  app: Application;
  options: ServiceOptions;

  constructor(options: ServiceOptions = {}, app: Application) {
    this.options = options;
    this.app = app;
  }

  async create(
    data: Electron.NotificationConstructorOptions
  ): Promise<NotificationInfo> {
    if (
      data.icon &&
      typeof data.icon === "string" &&
      data.icon.includes("base64")
    )
      data.icon = nativeImage.createFromDataURL(data.icon);
    const notification = new ElectronNotification(data);
    notification.show();
    return {
      status: true,
    };
  }
}
