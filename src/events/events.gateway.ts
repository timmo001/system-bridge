import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WsResponse,
} from "@nestjs/websockets";
import { Injectable, UseGuards } from "@nestjs/common";
import { uuid } from "systeminformation";
import mqtt from "mqtt";
import WebSocket from "ws";

import { Event } from "./entities/event.entity";
import { getMqttOptions } from "../common";
import { startServer, stopServer } from "../main";
import { WsAuthGuard } from "../wsAuth.guard";
import logger from "../logger";

@Injectable()
@WebSocketGateway()
export class EventsGateway {
  private authenticatedClients: Array<WebSocket> = [];

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
    const { enabled, host, port, username, password } = await getMqttOptions();
    if (enabled) {
      const id = (await uuid()).os;
      const mqttClient = mqtt.connect(`mqtt://${host}:${port}`, {
        username,
        password,
        clientId: id,
      });
      const topic = `systembridge/event/${id}/${data.name}`;
      logger.debug(`WebSocket - MQTT - Publishing to topic ${topic}`);
      mqttClient.publish(
        topic,
        JSON.stringify(data.data),
        { qos: 1, retain: true },
        (error?: Error) => {
          if (error)
            logger.error(
              `WebSocket - MQTT - Error publishing message: ${error.message}`
            );
        }
      );
    }
    return { event: "event-sent", data };
  }
}
