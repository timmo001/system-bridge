import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WsResponse,
} from "@nestjs/websockets";
import { UseGuards } from "@nestjs/common";
import WebSocket from "ws";

import { Event } from "./entities/event.entity";
import { getSettings } from "../../common";
import { WsAuthGuard } from "../wsAuth.guard";
import logger from "../../logger";

const settings = getSettings();
const networkSettings = settings?.network.items;

const port: number =
  typeof networkSettings?.wsPort?.value === "number"
    ? networkSettings?.wsPort?.value
    : 9172;

@WebSocketGateway(port, { transports: ["websocket"] })
export class EventsGateway {
  private authenticatedClients: Array<WebSocket> = [];

  @UseGuards(WsAuthGuard)
  @SubscribeMessage("register-listener")
  async handleAuthenticate(
    @ConnectedSocket() client: WebSocket
  ): Promise<WsResponse<boolean>> {
    logger.info("WebSocket - New client registered");
    this.authenticatedClients.push(client);
    return { event: "registered-listener", data: true };
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage("events")
  handleEvent(@MessageBody() { data }: { data: Event }): WsResponse<Event> {
    logger.info(`WebSocket - New event: ${data.name}`);
    this.authenticatedClients.forEach((ws: WebSocket) =>
      ws.send(JSON.stringify({ event: "events", data }))
    );
    return { event: "event-sent", data };
  }
}
