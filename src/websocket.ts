import WebSocket from "ws";

import { Event } from "./types/event.entity";

export class WebSocketConnection {
  public onEvent?: (data: Event) => void;
  public port: number;
  public websocket: WebSocket | undefined;

  private apiKey: string;

  constructor(port: number, apiKey: string, connected?: () => void) {
    this.port = port;
    this.apiKey = apiKey;
    (async () => {
      this.websocket = await this.connect();
      if (connected) connected();
    })();
  }

  private async connect(): Promise<WebSocket> {
    const ws = new WebSocket(`ws://localhost:${this.port}`);
    await new Promise<void>((resolve) => ws.on("open", () => resolve()));
    ws.on("message", (data: WebSocket.Data) => {
      if (typeof data === "string") {
        const json = JSON.parse(data);
        if (json.event === "events" && json.data && this.onEvent)
          this.onEvent(json.data);
      }
    });
    ws.send(
      JSON.stringify({
        event: "register-listener",
        data: {
          "api-key": this.apiKey,
        },
      })
    );
    return ws;
  }

  async close(): Promise<void> {
    if (this.websocket && this.websocket.readyState === this.websocket.OPEN)
      this.websocket.close();
  }

  sendEvent(event: Event): void {
    if (this.websocket && this.websocket.readyState === this.websocket.OPEN)
      this.websocket.send(
        JSON.stringify({
          event: "events",
          data: {
            "api-key": this.apiKey,
            data: event,
          },
        })
      );
  }
}
