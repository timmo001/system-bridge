import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WsResponse,
} from "@nestjs/websockets";
import { Socket } from "socket.io";

import { Event } from "./entities/event.entity";
import { getSettings } from "../../common";
import logger from "../../logger";

const settings = getSettings();
const networkSettings = settings?.network.items;

const port: number =
  typeof networkSettings?.wsPort?.value === "number"
    ? networkSettings?.wsPort?.value
    : 9172;

@WebSocketGateway(port, { transports: ["websocket"] })
export class EventsGateway {
  @SubscribeMessage("events")
  handleEvent(
    @MessageBody() data: Event,
    @ConnectedSocket() client: Socket
  ): WsResponse<Event> {
    console.log(data);
    logger.info(
      `New event from ${client.id} (${
        client.conn.remoteAddress
      }): ${JSON.stringify(data)}`
    );
    return { event: "events", data };
  }
}
