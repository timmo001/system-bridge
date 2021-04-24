import { UseGuards } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from "@nestjs/websockets";
import { Socket } from "socket.io";

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
  @UseGuards()
  @SubscribeMessage("events")
  handleEvent(
    @MessageBody() data: string,
    @ConnectedSocket() client: Socket
  ): string {
    console.log(data);
    logger.info(
      `New event from ${client.id} (${
        client.conn.remoteAddress
      }): ${JSON.stringify(data)}`
    );
    return data;
  }
}
