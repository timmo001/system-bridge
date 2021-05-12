import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WsResponse,
} from "@nestjs/websockets";
import { UseGuards } from "@nestjs/common";

import { Event } from "./entities/event.entity";
import { getSettings } from "../../common";
import { WsAuthGuard } from "../wsAuth.guard";

const settings = getSettings();
const networkSettings = settings?.network.items;

const port: number =
  typeof networkSettings?.wsPort?.value === "number"
    ? networkSettings?.wsPort?.value
    : 9172;

@WebSocketGateway(port, { transports: ["websocket"] })
export class EventsGateway {
  @UseGuards(WsAuthGuard)
  @SubscribeMessage("events")
  handleEvent(@MessageBody() { data }: { data: Event }): WsResponse<Event> {
    return { event: "events", data };
  }
}
