import { SettingsValue } from "assets/entities/settings.entity";
import { PlayerStatus } from "components/Player/Utils";
import { Event } from "../../assets/entities/event.entity";

export class WebSocketConnection {
  public onEvent?: (event: Event) => void;
  public port: number;
  public websocket: WebSocket | undefined;

  private apiKey: string;

  constructor(port: number, apiKey: string, connected?: () => void) {
    this.port = port || 9170;
    this.apiKey = apiKey;
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
    const ws = new WebSocket(
      `ws://${window.location.hostname || "localhost"}:${
        this.port
      }/api/websocket`,
    );
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
          api_key: this.apiKey,
          event: "GET_DATA",
          modules: modules,
        }),
      );
    }
  }

  getSettings(): void {
    if (this.websocket && this.websocket.readyState === this.websocket.OPEN) {
      console.log("Get settings");
      this.websocket.send(
        JSON.stringify({
          api_key: this.apiKey,
          event: "GET_SETTINGS",
        }),
      );
    }
  }

  registerDataListener(modules: Array<string>): void {
    if (this.websocket && this.websocket.readyState === this.websocket.OPEN) {
      console.log("Register data listener:", modules);
      this.websocket.send(
        JSON.stringify({
          api_key: this.apiKey,
          event: "REGISTER_DATA_LISTENER",
          modules: modules,
        }),
      );
    }
  }

  sendPlayerStatus(status: PlayerStatus): void {
    if (this.websocket && this.websocket.readyState === this.websocket.OPEN) {
      this.websocket.send(
        JSON.stringify({
          api_key: this.apiKey,
          event: "MEDIA_STATUS",
          status: status,
        }),
      );
    }
  }

  updateSetting(key: string, value: SettingsValue): void {
    if (this.websocket && this.websocket.readyState === this.websocket.OPEN) {
      console.log("Update setting:", { key, value });
      this.websocket.send(
        JSON.stringify({
          api_key: this.apiKey,
          event: "UPDATE_SETTING",
          setting: key,
          value: value,
        }),
      );
    }
  }
}
