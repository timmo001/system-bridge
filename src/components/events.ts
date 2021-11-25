import { Event } from "./api/events/entities/event.entity";
import { Logger } from "./logger";
import { Observer } from "./observer";
import { runService } from "./common";
import { stopServer, updateAppConfig } from "./api";
import { WebSocketConnection } from "./websocket";

export class Events {
  private websocketConnection: WebSocketConnection;
  private observer: Observer;

  async setup(settings: { [key: string]: string }): Promise<void> {
    this.websocketConnection = new WebSocketConnection(
      Number(settings["network-wsPort"]) || 9172,
      settings["network-apiKey"],
      true,
      () => {
        const { logger } = new Logger("Events");

        logger.info("Listening");
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

        logger.close();
      }
    );
    this.websocketConnection.onEvent = async (event: Event) => {
      const { logger } = new Logger("Events");

      switch (event.name) {
        case "exit-application":
          await stopServer();
          logger.info("Exit application");
          logger.close();
          process.exit(0);
        case "get-data":
          logger.info("Get data");
          this.websocketConnection.sendEvent({ name: "getting-data" });
          if (Array.isArray(event.data) && event.data.length > 0)
            for (const data of event.data) {
              logger.info(`Get data: ${JSON.stringify(data)}`);
              // Legacy support
              if (typeof data === "string") {
                data = { service: data, method: "findAll", observe: true };
              }
              try {
                this.websocketConnection.sendEvent({
                  name: `data-${data.service.replace(
                    /([A-Z])/g,
                    (x: string) => `-${x.toLowerCase()}`
                  )}`,
                  data: await runService(data),
                });
                if (data.observe) this.observer.startJob(data);
              } catch (e) {
                logger.error(
                  `Service error for ${JSON.stringify(data)}: ${e.message}`
                );
              }
            }
          break;
        case "observer-stop":
          logger.info("Stop Observer");
          if (this.observer) this.observer.stop();
          break;
        case "update-app-config":
          logger.info("Update app config");
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
