import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WsResponse,
} from "@nestjs/websockets";
import { Inject, UseGuards } from "@nestjs/common";
import { MqttService } from "nest-mqtt";
import { uuid } from "systeminformation";
import WebSocket from "ws";

import { Event } from "./entities/event.entity";
import { startServer, stopServer } from "../main";
import { WsAuthGuard } from "../wsAuth.guard";
import logger from "../logger";

@WebSocketGateway()
export class EventsGateway {
  private authenticatedClients: Array<WebSocket> = [];

  constructor(@Inject(MqttService) private readonly mqttService: MqttService) {}

  @UseGuards(WsAuthGuard)
  @SubscribeMessage("register-listener")
  async handleRegisterListener(
    @ConnectedSocket() client: WebSocket
  ): Promise<WsResponse<boolean>> {
    logger.info("WebSocket - New client registered");
    this.authenticatedClients.push(client);
    return { event: "registered-listener", data: true };
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage("events")
  async handleEvent(
    @MessageBody() { data }: { data: Event }
  ): Promise<WsResponse<Event>> {
    logger.debug(`WebSocket - New event: ${data.name}`);
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
    this.mqttService.publish(
      `systembridge/${(await uuid()).os}/event/${data.name}`,
      data.data
    );
    return { event: "event-sent", data };
  }
}
