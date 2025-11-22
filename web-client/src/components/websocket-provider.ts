import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { provide } from "@lit/context";
import { consume } from "@lit/context";
import type { z } from "zod";
import {
  websocketContext,
  type WebSocketState,
  CONNECTION_TIMEOUT,
  UPDATE_TIMEOUT,
  MAX_RETRIES,
  RETRY_DELAY,
} from "~/contexts/websocket";
import { connectionContext, type ConnectionSettings } from "~/contexts/connection";
import { generateUUID } from "~/lib/utils";
import {
  DefaultModuleData,
  Modules,
  type ModuleData,
} from "~/lib/system-bridge/types-modules";
import type { Settings } from "~/lib/system-bridge/types-settings";
import {
  WebSocketResponseSchema,
  type WebSocketRequest,
} from "~/lib/system-bridge/types-websocket";

type PendingResolver<T = unknown> = {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
  schema: z.ZodSchema<T>;
};

@customElement("websocket-provider")
export class WebSocketProvider extends LitElement {
  @consume({ context: connectionContext, subscribe: true })
  @property({ attribute: false })
  connection!: ConnectionSettings;

  @state()
  private _data: ModuleData = DefaultModuleData;

  @state()
  private _isConnected = false;

  @state()
  private _settings: Settings | null = null;

  @state()
  private _error: string | null = null;

  @state()
  private _retryCount = 0;

  @state()
  private _isRequestingData = false;

  @state()
  private _isSettingsUpdatePending = false;

  private _ws: WebSocket | null = null;
  private _connectionTimeout: number | null = null;
  private _reconnectTimeout: number | null = null;
  private _settingsUpdateTimeout: number | null = null;
  private _previousConnectedState = false;
  private _pendingResolvers: Record<string, PendingResolver> = {};

  @provide({ context: websocketContext })
  get websocketState(): WebSocketState {
    return {
      data: this._data,
      isConnected: this._isConnected,
      settings: this._settings,
      error: this._error,
      sendRequest: this.sendRequest.bind(this),
      sendRequestWithResponse: this.sendRequestWithResponse.bind(this),
      retryConnection: this.retryConnection.bind(this),
    };
  }

  protected createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.connect();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.cleanup();
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has("connection")) {
      this.handleConnectionChange();
    }
  }

  private handleConnectionChange() {
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
    this._retryCount = 0;
    this._error = null;
    this.connect();
  }

  private clearAllPendingResolvers(reason: string) {
    Object.entries(this._pendingResolvers).forEach(([id, resolver]) => {
      resolver.reject(new Error(reason));
      delete this._pendingResolvers[id];
    });
  }

  private handleMessage(event: MessageEvent<string>) {
    console.log("Received message:", event.data);

    let parsedMessage;
    try {
      parsedMessage = WebSocketResponseSchema.safeParse(JSON.parse(event.data));
    } catch (error) {
      console.error("Failed to parse WebSocket message:", error);
      this._error = "Received invalid message from server";
      return;
    }

    if (!parsedMessage.success) {
      console.error("Invalid message:", parsedMessage.error);
      this._error = "Received invalid message format from server";
      return;
    }

    const message = parsedMessage.data;

    if (message.id && this._pendingResolvers[message.id]) {
      const resolver = this._pendingResolvers[message.id];
      const parsedData = resolver.schema.safeParse(message.data);
      if (parsedData?.success) {
        resolver.resolve(parsedData.data);
      } else {
        console.error("Invalid message data:", parsedData?.error);
        this._error = "Received invalid message data from server";
        resolver.reject(parsedData?.error);
      }
      delete this._pendingResolvers[message.id];
      return;
    }

    switch (message.type) {
      case "DATA_UPDATE":
        if (!message.module || !message.data) {
          console.error("Invalid data update");
          return;
        }
        console.log("Data received:", message.data);
        this._data = {
          ...this._data,
          [message.module]: message.data,
        };
        this._isRequestingData = false;
        break;

      case "SETTINGS_RESULT":
        if (this._isSettingsUpdatePending) {
          console.log("Ignoring SETTINGS_RESULT during update");
          break;
        }
        const receivedSettings = message.data as Partial<Settings>;
        this._settings = {
          autostart: receivedSettings.autostart ?? false,
          hotkeys: receivedSettings.hotkeys ?? [],
          logLevel: receivedSettings.logLevel ?? "INFO",
          media: {
            directories: receivedSettings.media?.directories ?? [],
          },
        };
        console.log("Settings received:", this._settings);
        this._isRequestingData = false;
        break;

      case "DATA_LISTENER_REGISTERED":
        console.log("Data listener registered");
        break;

      case "SETTINGS_UPDATED":
        const updatedSettings = message.data as Partial<Settings>;
        this._settings = {
          autostart: updatedSettings.autostart ?? this._settings?.autostart ?? false,
          hotkeys: updatedSettings.hotkeys ?? this._settings?.hotkeys ?? [],
          logLevel: updatedSettings.logLevel ?? this._settings?.logLevel ?? "INFO",
          media: {
            directories:
              updatedSettings.media?.directories ??
              this._settings?.media.directories ??
              [],
          },
        };
        console.log("Settings updated:", this._settings);
        this._isSettingsUpdatePending = false;
        if (this._settingsUpdateTimeout) {
          clearTimeout(this._settingsUpdateTimeout);
          this._settingsUpdateTimeout = null;
        }
        break;

      case "ERROR":
        if (message.subtype === "BAD_TOKEN") {
          this._error =
            "Invalid API token. Please check your connection settings and update your token.";
          this._isConnected = false;
          this._retryCount = MAX_RETRIES + 1;
          this.showToast(
            "Authentication Failed",
            "Your API token is invalid or has expired.",
            "error",
          );
          this._ws?.close();
          return;
        } else {
          this._error = `Server error: ${message.data ?? "Unknown error"}`;
        }
        break;

      default:
        console.warn("Unknown message type:", message.type);
        break;
    }

    this.requestUpdate();
  }

  private connect() {
    const { host, port, ssl, token } = this.connection;

    if (!host || !port || !token) return;
    if (this._ws) return;

    if (this._connectionTimeout) {
      clearTimeout(this._connectionTimeout);
    }

    this._connectionTimeout = window.setTimeout(() => {
      if (this._ws && this._ws.readyState === WebSocket.CONNECTING) {
        this._ws.close();
        this._error =
          "Connection timeout. Please check your host, port, and network connection.";
        this._isConnected = false;
        this.requestUpdate();
      }
    }, CONNECTION_TIMEOUT);

    try {
      this._ws = new WebSocket(`${ssl ? "wss" : "ws"}://${host}:${port}/api/websocket`);
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      this._error = "Failed to create connection. Please check your connection settings.";
      this._isConnected = false;
      this.requestUpdate();
      return;
    }

    this._ws.onopen = () => {
      console.log("WebSocket connected");
      this._isConnected = true;
      this._error = null;
      this._retryCount = 0;

      if (this._connectionTimeout) {
        clearTimeout(this._connectionTimeout);
        this._connectionTimeout = null;
      }

      if (this._reconnectTimeout) {
        clearTimeout(this._reconnectTimeout);
      }

      if (!this._previousConnectedState) {
        this.showToast("Connected", "Connected to System Bridge", "success");
      }
      this._previousConnectedState = true;

      if (!this._isRequestingData) {
        this._isRequestingData = true;
        this.sendRequest({
          id: generateUUID(),
          event: "GET_SETTINGS",
          token: token!,
        });

        this.sendRequest({
          id: generateUUID(),
          event: "GET_DATA",
          data: { modules: Modules },
          token: token!,
        });

        this.sendRequest({
          id: generateUUID(),
          event: "REGISTER_DATA_LISTENER",
          data: { modules: Modules },
          token: token!,
        });
      }

      this.requestUpdate();
    };

    this._ws.onclose = (event: CloseEvent) => {
      console.log("WebSocket disconnected", event);
      this._isConnected = false;

      if (this._connectionTimeout) {
        clearTimeout(this._connectionTimeout);
        this._connectionTimeout = null;
      }

      this.clearAllPendingResolvers("WebSocket connection closed");

      if (this._previousConnectedState && this._error) {
        this.showToast("Disconnected", "Disconnected from System Bridge", "error");
      }
      this._previousConnectedState = false;

      if (event.code === 1006) {
        this._error =
          "Connection closed unexpectedly. Please check your host and port settings.";
      } else if (event.code === 1002) {
        this._error = "Connection failed due to protocol error.";
      } else if (event.code === 1003) {
        this._error = "Invalid API token. Please check your connection settings.";
        this._retryCount = MAX_RETRIES + 1;
        this.showToast("Authentication Failed", "Invalid API token", "error");
      } else if (event.code !== 1000 && event.code !== 1001) {
        this._error = `Connection closed with code ${event.code}: ${event.reason || "Unknown reason"}`;
      }

      this.requestUpdate();
      this.scheduleReconnect();
    };

    this._ws.onerror = (error: Event) => {
      console.error("WebSocket error:", error);
      this._isConnected = false;

      if (this._connectionTimeout) {
        clearTimeout(this._connectionTimeout);
        this._connectionTimeout = null;
      }

      this.clearAllPendingResolvers("WebSocket connection error");

      if (this._retryCount === 0) {
        this._error =
          "Connection failed. Please check your host, port, and network connection.";
      }

      this.requestUpdate();
    };

    this._ws.onmessage = this.handleMessage.bind(this);
  }

  private scheduleReconnect() {
    const { host, port, token } = this.connection;

    if (!host || !port || !token) return;
    if (this._isConnected) return;

    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout);
    }

    this._reconnectTimeout = window.setTimeout(() => {
      if (this._retryCount < MAX_RETRIES) {
        console.log(`Attempting to reconnect... (${this._retryCount + 1}/${MAX_RETRIES})`);
        this._retryCount++;
        this._ws = null;
        this.connect();
      } else {
        this._error = `Failed to connect after ${MAX_RETRIES} attempts. Please check your connection settings and try again.`;
        this.requestUpdate();
      }
    }, RETRY_DELAY);
  }

  sendRequest(request: WebSocketRequest) {
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return;
    if (!request.token) throw new Error("No token found");

    if (request.event === "UPDATE_SETTINGS") {
      this._isSettingsUpdatePending = true;
      if (this._settingsUpdateTimeout) {
        clearTimeout(this._settingsUpdateTimeout);
      }
      this._settingsUpdateTimeout = window.setTimeout(() => {
        this._isSettingsUpdatePending = false;
        this._error =
          "Settings update timed out. Please try again or check your connection.";
        this.requestUpdate();
      }, UPDATE_TIMEOUT);
    }

    console.log("Sending request:", request);
    this._ws.send(JSON.stringify(request));
  }

  sendRequestWithResponse<T>(
    request: WebSocketRequest,
    schema: z.ZodSchema<T>,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
        reject(new Error("WebSocket is not connected"));
        return;
      }
      if (!request.id) {
        reject(new Error("Request must have an id"));
        return;
      }

      console.log("Sending request with response:", request.id);
      this._pendingResolvers[request.id] = { resolve, reject, schema };

      try {
        this._ws.send(JSON.stringify(request));
      } catch (e) {
        delete this._pendingResolvers[request.id];
        reject(e instanceof Error ? e : new Error("Unknown error"));
      }

      setTimeout(() => {
        if (this._pendingResolvers[request.id]) {
          delete this._pendingResolvers[request.id];
          reject(new Error("WebSocket response timed out"));
        }
      }, UPDATE_TIMEOUT);
    });
  }

  retryConnection() {
    this._error = null;
    this._retryCount = 0;
    this.clearAllPendingResolvers("WebSocket connection retried");
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
    this.connect();
  }

  private cleanup() {
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
    if (this._connectionTimeout) {
      clearTimeout(this._connectionTimeout);
      this._connectionTimeout = null;
    }
    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout);
      this._reconnectTimeout = null;
    }
    if (this._settingsUpdateTimeout) {
      clearTimeout(this._settingsUpdateTimeout);
      this._settingsUpdateTimeout = null;
    }
    this.clearAllPendingResolvers("WebSocket provider disconnected");
  }

  private showToast(title: string, message: string, type: "success" | "error") {
    // Simple console log for now - will be replaced with actual toast component
    console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
    // TODO: Implement toast notifications
  }

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "websocket-provider": WebSocketProvider;
  }
}
