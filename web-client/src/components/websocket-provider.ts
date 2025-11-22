import { ContextConsumer, ContextProvider } from "@lit/context";
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";
import type { z } from "zod";

import {
  connectionContext,
  type ConnectionSettings,
} from "~/contexts/connection";
import {
  websocketContext,
  type WebSocketState,
  CONNECTION_TIMEOUT,
  UPDATE_TIMEOUT,
  MAX_RETRIES,
  RETRY_DELAY,
} from "~/contexts/websocket";
import { showNotification } from "~/lib/notifications";
import {
  DefaultModuleData,
  ModuleNameSchema,
  Modules,
  type ModuleData,
} from "~/lib/system-bridge/types-modules";
import { ModuleDataSchemas } from "~/lib/system-bridge/types-modules-schemas";
import type { Settings } from "~/lib/system-bridge/types-settings";
import {
  WebSocketResponseSchema,
  type WebSocketRequest,
} from "~/lib/system-bridge/types-websocket";
import { generateUUID } from "~/lib/utils";
import { ProviderElement } from "~/mixins";

interface PendingResolver<T = unknown> {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
  schema: z.ZodType<T>;
}

type AnyPendingResolver = PendingResolver;

@customElement("websocket-provider")
export class WebSocketProvider extends ProviderElement {
  connection: ConnectionSettings | undefined;

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
  private _pendingResolvers = new Map<string, AnyPendingResolver>();
  // Consumer must be stored to keep subscription alive
  // @ts-expect-error - TS6133: Field is used via subscription callback
  private _connectionConsumer!: ContextConsumer<typeof connectionContext, this>;
  private _websocketProvider!: ContextProvider<typeof websocketContext>;

  constructor() {
    super();
    this._connectionConsumer = new ContextConsumer(this, {
      context: connectionContext,
      callback: (value) => {
        this.connection = value;
        this.handleConnectionChange();
      },
      subscribe: true,
    });
    this._websocketProvider = new ContextProvider(this, {
      context: websocketContext,
    });
  }

  private get websocketState(): WebSocketState {
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

  private updateWebSocketContext() {
    if (this._websocketProvider) {
      this._websocketProvider.setValue(this.websocketState);
    }
  }

  requestUpdate(name?: PropertyKey, oldValue?: unknown): void {
    super.requestUpdate(name, oldValue);
    this.updateWebSocketContext();
  }

  connectedCallback() {
    super.connectedCallback();
    this.updateWebSocketContext();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.cleanup();
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
    this._pendingResolvers.forEach((resolver) => {
      resolver.reject(new Error(reason));
    });
    this._pendingResolvers.clear();
  }

  private handleMessage(event: MessageEvent<string>) {
    let parsedMessage;
    try {
      parsedMessage = WebSocketResponseSchema.safeParse(JSON.parse(event.data));
    } catch (error) {
      console.error("Failed to parse WebSocket message:", error, "Data:", event.data);
      this._error = "Received invalid message from server";
      return;
    }

    if (!parsedMessage.success) {
      this._error = "Received invalid message format from server";
      return;
    }

    const message = parsedMessage.data;

    if (message.id && this._pendingResolvers.has(message.id)) {
      const resolver = this._pendingResolvers.get(message.id);
      if (!resolver) return;

      const parsedData = resolver.schema.safeParse(message.data);
      if (parsedData?.success) {
        resolver.resolve(parsedData.data);
      } else {
        this._error = "Received invalid message data from server";
        resolver.reject(parsedData?.error);
      }
      this._pendingResolvers.delete(message.id);
      return;
    }

    switch (message.type) {
      case "DATA_UPDATE": {
        if (!message.module || !message.data) {
          return;
        }
        const moduleValidation = ModuleNameSchema.safeParse(message.module);
        if (!moduleValidation.success) {
          this._error = `Received invalid module name: ${message.module}`;
          return;
        }
        const moduleName = moduleValidation.data;
        const moduleSchema = ModuleDataSchemas[moduleName];
        const dataValidation = moduleSchema.safeParse(message.data);
        if (!dataValidation.success) {
          this._error = `Received invalid data for module ${moduleName}`;
          console.error(
            `Module ${moduleName} validation error:`,
            dataValidation.error,
          );
          return;
        }
        this._data = {
          ...this._data,
          [moduleName]: dataValidation.data,
        };
        this._isRequestingData = false;
        break;
      }

      case "SETTINGS_RESULT": {
        if (this._isSettingsUpdatePending) {
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
        this._isRequestingData = false;
        break;
      }

      case "DATA_LISTENER_REGISTERED":
        break;

      case "SETTINGS_UPDATED": {
        const updatedSettings = message.data as Partial<Settings>;
        this._settings = {
          autostart:
            updatedSettings.autostart ?? this._settings?.autostart ?? false,
          hotkeys: updatedSettings.hotkeys ?? this._settings?.hotkeys ?? [],
          logLevel:
            updatedSettings.logLevel ?? this._settings?.logLevel ?? "INFO",
          media: {
            directories:
              updatedSettings.media?.directories ??
              this._settings?.media.directories ??
              [],
          },
        };
        this._isSettingsUpdatePending = false;
        if (this._settingsUpdateTimeout) {
          clearTimeout(this._settingsUpdateTimeout);
          this._settingsUpdateTimeout = null;
        }
        break;
      }

      case "ERROR":
        if (message.subtype === "BAD_TOKEN") {
          this._error =
            "Invalid API token. Please check your connection settings and update your token.";
          this._isConnected = false;
          this._retryCount = MAX_RETRIES + 1;
          showNotification(
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
        break;
    }

    this.requestUpdate();
  }

  private connect() {
    // Guard against undefined connection (context not yet provided)
    if (!this.connection) {
      return;
    }

    const { host, port, ssl, token } = this.connection;

    if (!host || !port) {
      const error =
        "Connection settings are incomplete. Please configure host and port.";
      this._error = error;
      this._isConnected = false;
      this.requestUpdate();
      return;
    }

    if (!token) {
      const error =
        "API token is required. Please configure your token in connection settings.";
      this._error = error;
      this._isConnected = false;
      this.requestUpdate();
      return;
    }

    if (this._ws) {
      return;
    }

    if (this._connectionTimeout) {
      clearTimeout(this._connectionTimeout);
    }

    this._connectionTimeout = window.setTimeout(() => {
      // Fix race condition: Store WebSocket reference and state before check
      const ws = this._ws;
      const currentState = ws?.readyState;
      if (ws && currentState === WebSocket.CONNECTING) {
        ws.close();
        this._error =
          "Connection timeout. Please check your host, port, and network connection.";
        this._isConnected = false;
        this.requestUpdate();
      }
    }, CONNECTION_TIMEOUT);

    try {
      this._ws = new WebSocket(
        `${ssl ? "wss" : "ws"}://${host}:${port}/api/websocket`,
      );
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      this._error =
        "Failed to create connection. Please check your connection settings.";
      this._isConnected = false;
      this.requestUpdate();
      return;
    }

    this._ws.onopen = () => {
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
        showNotification("Connected", "Connected to System Bridge", "success");
      }
      this._previousConnectedState = true;

      if (!this._isRequestingData) {
        this._isRequestingData = true;
        this.sendRequest({
          id: generateUUID(),
          event: "GET_SETTINGS",
          token: token,
        });

        this.sendRequest({
          id: generateUUID(),
          event: "GET_DATA",
          data: { modules: Modules },
          token: token,
        });

        this.sendRequest({
          id: generateUUID(),
          event: "REGISTER_DATA_LISTENER",
          data: { modules: Modules },
          token: token,
        });
      }

      this.requestUpdate();
    };

    this._ws.onclose = (event: CloseEvent) => {
      this._isConnected = false;

      if (this._connectionTimeout) {
        clearTimeout(this._connectionTimeout);
        this._connectionTimeout = null;
      }

      this.clearAllPendingResolvers("WebSocket connection closed");

      if (this._previousConnectedState && this._error) {
        showNotification(
          "Disconnected",
          "Disconnected from System Bridge",
          "error",
        );
      }
      this._previousConnectedState = false;

      if (event.code === 1006) {
        this._error =
          "Connection closed unexpectedly. Please check your host and port settings.";
      } else if (event.code === 1002) {
        this._error = "Connection failed due to protocol error.";
      } else if (event.code === 1003) {
        this._error =
          "Invalid API token. Please check your connection settings.";
        this._retryCount = MAX_RETRIES + 1;
        showNotification("Authentication Failed", "Invalid API token", "error");
      } else if (event.code !== 1000 && event.code !== 1001) {
        this._error = `Connection closed with code ${event.code}: ${event.reason || "Unknown reason"}`;
      }

      this.requestUpdate();
      this.scheduleReconnect();
    };

    this._ws.onerror = () => {
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
    // Guard against undefined connection (context not yet provided)
    if (!this.connection) return;

    const { host, port, token } = this.connection;

    if (!host || !port || !token) {
      // Don't attempt reconnect if settings are incomplete
      return;
    }
    if (this._isConnected) return;

    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout);
    }

    this._reconnectTimeout = window.setTimeout(() => {
      if (this._retryCount < MAX_RETRIES) {
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

    this._ws.send(JSON.stringify(request));
  }

  sendRequestWithResponse<T>(
    request: WebSocketRequest,
    schema: z.ZodType<T>,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
        reject(new Error("WebSocket is not connected"));
        return;
      }
      if (!request.id) {
        reject(new Error("Request must have an id"));
        return;
      }

      this._pendingResolvers.set(request.id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        schema,
      });

      try {
        this._ws.send(JSON.stringify(request));
      } catch (e) {
        this._pendingResolvers.delete(request.id);
        reject(e instanceof Error ? e : new Error("Unknown error"));
      }

      setTimeout(() => {
        if (this._pendingResolvers.has(request.id)) {
          this._pendingResolvers.delete(request.id);
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

  render() {
    // In Light DOM, content passes through naturally
    return html``;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "websocket-provider": WebSocketProvider;
  }
}
