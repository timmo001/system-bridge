import { Event } from "./events/entities/event.entity";
import { Observer } from "./observer";
import { stopServer, updateAppConfig } from "./main";
import { WebSocketConnection } from "./websocket";
import logger from "./logger";

export class Events {
  private websocket: WebSocketConnection;
  private observer: Observer;

  async setup(settings: { [key: string]: string }): Promise<void> {
    this.websocket = new WebSocketConnection(
      Number(settings["network-wsPort"]) || 9172,
      settings["network-apiKey"],
      true,
      () => {
        this.websocket.sendEvent({ name: "listening-for-events" });
        this.observer = new Observer();
        this.observer.setup(
          settings,
          (data: { [key: string]: { [key: string]: any } }) => {
            const key = Object.keys(data)[0];
            this.websocket.sendEvent({
              name: `observer-${key.replace(
                /([A-Z])/g,
                (x: string) => `-${x.toLowerCase()}`
              )}`,
              data: data[key],
            });
          }
        );
      }
    );
    this.websocket.onEvent = this.eventHandler;
  }

  cleanup(): void {
    this.observer.cleanup();
    this.websocket.close();
    this.observer = undefined;
    this.websocket = undefined;
  }

  private async eventHandler(event: Event) {
    switch (event.name) {
      case "exit-application":
        await stopServer();
        logger.info("Events - Exit application");
        process.exit(0);
      // case "observer-cpu-current-speed":
      //   logger.info(
      //     `Events - CPU current speed: ${JSON.stringify(event.data)}`
      //   );
      //   break;
      // case "observer-fs-size":
      //   logger.info(`Events - FS size: ${JSON.stringify(event.data)}`);
      //   break;
      // case "observer-usb":
      //   logger.info(`Events - USB: ${JSON.stringify(event.data)}`);
      //   break;
      case "update-app-config":
        logger.info("Events - Update app config");
        await updateAppConfig();
        break;
    }
  }
}
