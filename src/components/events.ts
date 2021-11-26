import { Event } from "./api/events/entities/event.entity";
import { Logger } from "./logger";
import { Observer, ObserverData } from "./observer";
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
        this.observer.callback = (observerData: ObserverData) => {
          this.websocketConnection?.sendEvent({
            name: `data-${observerData.service}${
              observerData.method !== undefined &&
              observerData.method !== "findAll"
                ? `-${observerData.method}`
                : ""
            }`,
            service: observerData.service,
            method: observerData.method,
            data: observerData.data,
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
            for (let eventData of event.data) {
              logger.info(`Get data: ${JSON.stringify(eventData)}`);
              // Legacy support
              if (typeof eventData === "string") {
                eventData = {
                  service: eventData,
                  method: "findAll",
                  observe: true,
                };
              }
              try {
                this.websocketConnection.sendEvent({
                  name: `data-${eventData.service}${
                    eventData.method !== undefined &&
                    eventData.method !== "findAll"
                      ? `-${eventData.method}`
                      : ""
                  }`,
                  service: eventData.service,
                  method: eventData.method,
                  data: await runService(eventData),
                });
                if (eventData.observe) await this.observer.startJob(eventData);
              } catch (e) {
                logger.error(
                  `Service error for ${JSON.stringify(eventData)}: ${e.message}`
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
