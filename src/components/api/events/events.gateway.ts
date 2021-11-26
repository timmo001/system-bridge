import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WsResponse,
} from "@nestjs/websockets";
import { Injectable, UseGuards } from "@nestjs/common";
import WebSocket from "ws";

import { Event } from "./entities/event.entity";
import { Logger } from "../../logger";
import { MQTT } from "../../mqtt";
import { startServer, stopServer } from "..";
import { WsAuthGuard } from "../wsAuth.guard";

const { logger } = new Logger("EventsGateway");

@Injectable()
@WebSocketGateway()
export class EventsGateway {
  private authenticatedClients: Array<WebSocket> = [];
  private mqtt: MQTT;

  constructor() {
    this.mqtt = new MQTT();
    this.mqtt.setup();
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage("register-listener")
  async handleRegisterListener(
    @ConnectedSocket() client: WebSocket
  ): Promise<WsResponse<boolean>> {
    logger.info("New client registered");
    this.authenticatedClients.push(client);
    return { event: "registered-listener", data: true };
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage("events")
  async handleEvent(
    @MessageBody() { data }: { data: Event }
  ): Promise<WsResponse<Event>> {
    logger.info(
      `New event: ${data.name}${
        data.service
          ? ` - ${data.service}${data.method ? ` - ${data.method}` : ""}`
          : ""
      }`
    );
    this.authenticatedClients.forEach((ws: WebSocket) =>
      ws.send(JSON.stringify({ event: "events", data }))
    );
    if (data.name === "restart-server")
      setTimeout(async () => {
        await stopServer();
        await startServer();
        if (data.data.openSettings === true)
          this.authenticatedClients.forEach((ws: WebSocket) =>
            ws.send(
              JSON.stringify({
                event: "events",
                data: { name: "open-settings" },
              })
            )
          );
      }, 200);
    if (data.name.includes("data-"))
      await this.mqtt.publish(
        `data/${data.name.replace("data-", "")}`,
        JSON.stringify(data.data)
      );
    return { event: "event-sent", data };
  }
}
