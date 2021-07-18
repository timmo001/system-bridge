import { Event } from "./events/entities/event.entity";
import { stopServer, updateAppConfig } from "./main";
import { WebSocketConnection } from "./websocket";
import logger from "./logger";

export class Events {
  private websocket: WebSocketConnection;

  async setup(wsPort: number, apiKey: string): Promise<void> {
    this.websocket = new WebSocketConnection(wsPort, apiKey, true, () =>
      this.websocket.sendEvent({ name: "open-rtc" })
    );
    this.websocket.onEvent = async (event: Event) => {
      logger.info(`Main - Event: ${event.name}`);
      switch (event.name) {
        case "exit-application":
          await stopServer();
          logger.info("Main - Exit application");
          process.exit(0);
        case "update-app-config":
          await updateAppConfig();
          break;
      }
    };
  }
}
