import { SettingsValue } from "assets/entities/settings.entity";
import { Event } from "../../assets/entities/event.entity";

export class WebSocketConnection {
  public onEvent?: (event: Event) => void;
  public port: number;
  public websocket: WebSocket | undefined;

  private apiKey: string;

  constructor(port: number, apiKey: string, connected?: () => void) {
    this.port = port;
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
    const ws = new WebSocket(`ws://localhost:${this.port}/api/websocket`);
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

  getData(modules: Array<string>): void {
    if (!this.websocket) return;
    console.log("Get data:", modules);
    this.websocket.send(
      JSON.stringify({
        event: "get-data",
        "api-key": this.apiKey,
        modules: modules,
      })
    );
  }

  getSettings(): void {
    if (!this.websocket) return;
    console.log("Get settings");
    this.websocket.send(
      JSON.stringify({
        event: "get-settings",
        "api-key": this.apiKey,
      })
    );
  }

  registerDataListener(modules: Array<string>): void {
    if (!this.websocket) return;
    console.log("Register data listener:", modules);
    this.websocket.send(
      JSON.stringify({
        event: "register-data-listener",
        "api-key": this.apiKey,
        modules: modules,
      })
    );
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

  updateSetting(key: string, value: SettingsValue): void {
    if (!this.websocket) return;
    console.log("Update setting:", { key, value });
    this.websocket.send(
      JSON.stringify({
        event: "update-setting",
        "api-key": this.apiKey,
        setting: key,
        value: value,
      })
    );
  }
}
