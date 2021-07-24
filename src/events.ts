import { Event } from "./events/entities/event.entity";
import { getConnection, getSettingsObject } from "./common";
import { Observer } from "./observer";
import { stopServer, updateAppConfig } from "./main";
import { WebSocketConnection } from "./websocket";
import axios, { AxiosResponse } from "axios";
import logger from "./logger";

export class Events {
  private websocketConnection: WebSocketConnection;
  private observer: Observer;

  async setup(settings: { [key: string]: string }): Promise<void> {
    this.websocketConnection = new WebSocketConnection(
      Number(settings["network-wsPort"]) || 9172,
      settings["network-apiKey"],
      true,
      () => {
        this.websocketConnection.sendEvent({ name: "listening-for-events" });
        this.observer = new Observer();
        this.observer.setup(
          settings,
          (data: { [key: string]: { [key: string]: any } }) => {
            const key = Object.keys(data)[0];
            this.websocketConnection.sendEvent({
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
    this.websocketConnection.onEvent = async (event: Event) => {
      switch (event.name) {
        case "get-data":
          logger.info("Events - Get data");
          this.websocketConnection.sendEvent({ name: "getting-data" });

          const connection = await getConnection();
          const settings = await getSettingsObject(connection);
          await connection.close();

          if (Array.isArray(event.data) && event.data.length > 0)
            event.data.forEach(async (name: string) => {
              logger.info(`Name: ${name}`);
              const url = `http://localhost:${
                settings["network-apiPort"] || 9170
              }/${name}`;
              axios
                .get<any>(url, {
                  headers: { "api-key": settings["network-apiKey"] },
                })
                .then((response: AxiosResponse<any>) => {
                  logger.info(`Response status: ${response.status}`);
                  if (response.status === 200 && this.websocketConnection)
                    this.websocketConnection.sendEvent({
                      name: `data-${name}`,
                      data: response.data,
                    });
                })
                .catch((error: Error) => {
                  logger.error(
                    `Error getting data from ${url}: ${error.message}`
                  );
                });
            });
          break;
        case "exit-application":
          await stopServer();
          logger.info("Events - Exit application");
          process.exit(0);
        case "update-app-config":
          logger.info("Events - Update app config");
          await updateAppConfig();
          break;
      }
    };
  }

  cleanup(): void {
    this.observer.cleanup();
    this.websocketConnection.close();
    this.observer = undefined;
    this.websocketConnection = undefined;
  }
}
