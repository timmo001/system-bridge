"use client";
import { v4 as uuid } from "uuid";

import { type Settings } from "@/types/settings";
import { PlayerStatus } from "@/components/player/utils";

export class WebSocketConnection {
  public onEvent?: (event: Event) => void;
  public host: string;
  public port: number;
  public websocket: WebSocket | undefined;

  private token: string;

  constructor(
    host: string,
    port: number,
    token: string,
    connected?: () => void
  ) {
    this.host = host;
    this.port = port;
    this.token = token;
    (async () => {
      this.websocket = await this.connect();
      if (
        connected &&
        this.websocket &&
        this.websocket.readyState === this.websocket.OPEN
      )
        connected();
    })();
  }

  close(): void {
    if (this.websocket && this.websocket.readyState === this.websocket.OPEN)
      this.websocket.close();
  }

  private async connect(): Promise<WebSocket> {
    const url = `ws://${this.host}:${this.port}/api/websocket`;

    console.log("Connecting to:", url);
    const ws = new WebSocket(url);

    await new Promise<void>((resolve) => {
      ws.onopen = () => resolve();
    });

    ws.onmessage = (event) => {
      if (typeof event.data === "string") {
        const json = JSON.parse(event.data);
        if (json && this.onEvent) this.onEvent(json);
      }
    };

    return ws;
  }

  isConnected(): boolean {
    return this.websocket?.readyState === WebSocket.OPEN;
  }

  getData(modules: Array<string>): void {
    if (this.websocket && this.websocket.readyState === this.websocket.OPEN) {
      console.log("Get data:", modules);
      this.websocket.send(
        JSON.stringify({
          id: uuid(),
          token: this.token,
          event: "GET_DATA",
          data: {
            modules: modules,
          },
        })
      );
    }
  }

  getSettings(): void {
    if (this.websocket && this.websocket.readyState === this.websocket.OPEN) {
      console.log("Get settings");
      this.websocket.send(
        JSON.stringify({
          id: uuid(),
          token: this.token,
          event: "GET_SETTINGS",
          data: {},
        })
      );
    }
  }

  registerDataListener(modules: Array<string>): void {
    if (this.websocket && this.websocket.readyState === this.websocket.OPEN) {
      console.log("Register data listener:", modules);
      this.websocket.send(
        JSON.stringify({
          id: uuid(),
          token: this.token,
          event: "REGISTER_DATA_LISTENER",
          data: {
            modules: modules,
          },
        })
      );
    }
  }

  sendPlayerStatus(status: PlayerStatus): void {
    if (this.websocket && this.websocket.readyState === this.websocket.OPEN) {
      this.websocket.send(
        JSON.stringify({
          id: uuid(),
          token: this.token,
          event: "MEDIA_STATUS",
          data: {
            status: status,
          },
        })
      );
    }
  }

  updateSettings(newSettings: Settings): void {
    if (this.websocket && this.websocket.readyState === this.websocket.OPEN) {
      console.log("Update setting:", newSettings);
      this.websocket.send(
        JSON.stringify({
          id: uuid(),
          token: this.token,
          event: "UPDATE_SETTINGS",
          data: newSettings,
        })
      );
    }
  }
}