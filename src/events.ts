import { Event } from "./api/events/entities/event.entity";
import { Observer } from "./observer";
import { runService } from "./common";
import { stopServer, updateAppConfig } from "./main";
import { WebSocketConnection } from "./websocket";
import logger from "./logger";

export class Events {
  private websocketConnection: WebSocketConnection;
  private observer: Observer;

  async setup(settings: { [key: string]: string }): Promise<void> {
    logger.debug("Events - Setup");
    this.websocketConnection = new WebSocketConnection(
      Number(settings["network-wsPort"]) || 9172,
      settings["network-apiKey"],
      true,
      () => {
        logger.info("Events - Listening");
        this.websocketConnection?.sendEvent({ name: "listening-for-events" });
        this.observer = new Observer(settings);
        this.observer.callback = (data: {
          [key: string]: { [key: string]: any };
        }) => {
          const key = Object.keys(data)[0];
          this.websocketConnection?.sendEvent({
            name: `data-${key.replace(
              /([A-Z])/g,
              (x: string) => `-${x.toLowerCase()}`
            )}`,
            data: data[key],
          });
        };
        this.observer.start();
      }
    );
    this.websocketConnection.onEvent = async (event: Event) => {
      switch (event.name) {
        case "exit-application":
          await stopServer();
          logger.info("Events - Exit application");
          process.exit(0);
        case "get-data":
          logger.info("Events - Get data");
          this.websocketConnection.sendEvent({ name: "getting-data" });
          if (Array.isArray(event.data) && event.data.length > 0)
            event.data.forEach(async (name: string) => {
              logger.debug(`Events - Get data: ${name}`);
              this.websocketConnection.sendEvent({
                name: `data-${name.replace(
                  /([A-Z])/g,
                  (x: string) => `-${x.toLowerCase()}`
                )}`,
                data: await runService({ name }),
              });
            });
          break;
        case "observer-stop":
          if (this.observer) this.observer.stop();
          break;
        case "observer-start":
          if (this.observer) this.observer.start();
          break;
        case "update-app-config":
          logger.info("Events - Update app config");
          await updateAppConfig();
          break;
      }
    };
  }

  cleanup(): void {
    this.observer.stop();
    this.websocketConnection.close();
    this.observer = undefined;
    this.websocketConnection = undefined;
  }
}
