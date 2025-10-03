// A Lit mixin that provides a WebSocket client for the System Bridge backend.
//
// Protocol reference:
// - WS endpoint: /api/websocket
// - Outgoing request: { id, event, data, apiKey }
// - Incoming response: { id, type, subtype, data, message?, module? }

import { LitElement } from "lit";

/**
 * All response types emitted by the backend over the websocket.
 */
type ResponseType =
  | "ERROR"
  | "APPLICATION_EXITING"
  | "DATA_GET"
  | "DIRECTORIES"
  | "DIRECTORY"
  | "FILES"
  | "FILE"
  | "KEYBOARD_KEY_PRESSED"
  | "KEYBOARD_TEXT_SENT"
  | "MEDIA_CONTROLLED"
  | "NOTIFICATION_SENT"
  | "OPENED"
  | "POWER_HIBERNATING"
  | "POWER_LOCKING"
  | "POWER_LOGGINGOUT"
  | "POWER_RESTARTING"
  | "POWER_SHUTTINGDOWN"
  | "POWER_SLEEPING"
  | "DATA_LISTENER_REGISTERED"
  | "DATA_LISTENER_UNREGISTERED"
  | "DATA_UPDATE"
  | "SETTINGS_RESULT"
  | "SETTINGS_UPDATED"
  | "DIRECTORY_VALIDATED";

/**
 * Additional classification for responses, mainly for error/detail states.
 */
type ResponseSubtype =
  | "NONE"
  | "BAD_REQUEST"
  | "BAD_API_KEY"
  | "BAD_JSON"
  | "BAD_DIRECTORY"
  | "BAD_FILE"
  | "BAD_PATH"
  | "INVALID_ACTION"
  | "LISTENER_ALREADY_REGISTERED"
  | "LISTENER_NOT_REGISTERED"
  | "MISSING_ACTION"
  | "MISSING_BASE"
  | "MISSING_KEY"
  | "MISSING_MODULES"
  | "MISSING_PATH"
  | "MISSING_PATH_URL"
  | "MISSING_SETTING"
  | "MISSING_TEXT"
  | "MISSING_TITLE"
  | "MISSING_API_KEY"
  | "MISSING_VALUE"
  | "UNKNOWN_EVENT";

/**
 * Generic websocket response shape returned by the backend.
 *
 * @template Data - Optional typed payload carried in the response `data` field.
 */
export interface WSMessageResponse<Data = unknown> {
  id: string;
  type: ResponseType;
  subtype: ResponseSubtype;
  data?: Data;
  message?: string;
  module?: string;
}

/**
 * Outgoing websocket request envelope sent to the backend.
 *
 * @template Data - Optional typed payload carried in the request `data` field.
 */
export interface WSRequest<Data = unknown> {
  id: string;
  event: string;
  data?: Data;
  apiKey: string;
}

/**
 * Listener invoked when a DATA_UPDATE message is received.
 *
 * @param module - Name of the module associated with the update.
 * @param data - The module data payload.
 */
export type DataUpdateListener = (module: string, data: unknown) => void;

type Ctor<T> = new (...args: any[]) => T;

/**
 * Interface describing the instance shape produced by `WSClientMixin`.
 * Consumers can use this to type their element instances.
 */
export declare class WSClientMixinClass extends LitElement {
  ws?: WebSocket | null;
  wsUrl: string;
  wsApiKey: string;
  get isConnected(): boolean;
  private _pending: Map<string, (resp: WSMessageResponse) => void>;
  private _dataListeners: Set<DataUpdateListener>;
  private _reconnectTimer?: number;

  /** Establishes the websocket connection (idempotent per token). */
  connect(): void;
  /** Sets the websocket URL for connections. */
  setWebSocketUrl(url: string): void;
  /** Closes the websocket and clears pending requests/listeners. */
  disconnect(): void;
  /**
   * Sends an event to the backend and resolves with the first response for that id.
   * @param event - Event name (e.g. "GET_DATA").
   * @param data - Optional payload to include in the message.
   */
  send<Data = unknown>(event: string, data?: Data): Promise<WSMessageResponse>;
  /** Registers this connection for module data updates. */
  registerDataListener(modules: string[]): Promise<WSMessageResponse>;
  /** Unregisters this connection from module data updates. */
  unregisterDataListener(): Promise<WSMessageResponse>;
  /** Triggers a one-shot data fetch; updates will arrive as DATA_UPDATE messages. */
  getData(modules: string[]): Promise<void>;
}

/**
 * Mixin that adds a System Bridge websocket client to a Lit element.
 *
 * Lifecycle:
 * - On `connectedCallback` it auto-connects if `wsApiKey` is set.
 * - Auto-reconnect is attempted after unexpected closure.
 *
 * Public API:
 * - `wsApiKey`: set the auth API key, then call `connect()`
 * - `send(event, data)`: send a request and await a response
 * - `registerDataListener(modules)`: subscribe to module updates
 * - `unregisterDataListener()`: unsubscribe
 * - `getData(modules)`: request current data; delivered via DATA_UPDATE
 * - `addDataUpdateListener(cb)` / `removeDataUpdateListener(cb)`
 */
export const WSClientMixin = <TBase extends Ctor<LitElement>>(Base: TBase) => {
  return class WSClient extends Base {
    ws?: WebSocket | null = null;
    wsUrl = 
      (location.protocol === "https:" ? "wss://" : "ws://") +
      location.host +
      "/api/websocket";
    wsApiKey = "";
    private _isConnected = false;

    get isConnected(): boolean {
      return this._isConnected;
    }
    private _pending: Map<string, (resp: WSMessageResponse) => void> = new Map();
    private _dataListeners: Set<DataUpdateListener> = new Set();
    private _reconnectTimer?: number;

    /** @inheritdoc */
    connectedCallback() {
      super.connectedCallback();
      if (this.wsApiKey) this.connect();
    }

    /** @inheritdoc */
    disconnectedCallback() {
      this.disconnect();
      super.disconnectedCallback();
    }

    /**
     * Sets the websocket URL for future connections.
     */
    setWebSocketUrl(url: string) {
      this.wsUrl = url;
    }

    /**
     * Opens a websocket connection to the backend and sets up listeners.
     * If already connected, the existing connection is replaced.
     */
    connect() {
      this.disconnect();
      if (!this.wsApiKey) return;

      try {
        const socket = new WebSocket(this.wsUrl);
        this.ws = socket;

        socket.onopen = () => {
          this._isConnected = true;
          this.requestUpdate?.();
        };

        socket.onmessage = (ev) => {
          let parsed: WSMessageResponse | undefined;
          try {
            parsed = JSON.parse(ev.data);
          } catch (_) {
            return;
          }

          if (!parsed) return;

          // Resolve pending by id
          const resolver = this._pending.get(parsed.id);
          if (resolver) {
            this._pending.delete(parsed.id);
            resolver(parsed);
          }

          // Broadcast data updates to listeners
          if (parsed.type === "DATA_UPDATE" && parsed.module) {
            for (const listener of this._dataListeners) {
              try {
                listener(parsed.module, parsed.data);
              } catch (_) {
                // ignore listener errors
              }
            }
          }
        };

        socket.onclose = () => {
          this._isConnected = false;
          this.requestUpdate?.();
          // lightweight reconnect
          if (this._reconnectTimer == null) {
            this._reconnectTimer = window.setTimeout(() => {
              this._reconnectTimer = undefined;
              if (this.wsApiKey) this.connect();
            }, 1500);
          }
        };

        socket.onerror = () => {
          // Error will typically be followed by close
        };
      } catch (_) {
        // swallow; will retry via timer
      }
    }

    /**
     * Closes the websocket connection and cancels any reconnection attempts.
     */
    disconnect() {
      if (this._reconnectTimer != null) {
        clearTimeout(this._reconnectTimer);
        this._reconnectTimer = undefined;
      }
      if (this.ws) {
        try {
          this.ws.close();
        } catch (_) {
          // ignore
        }
        this.ws = null;
      }
      this._isConnected = false;
      this._pending.clear();
    }

    /** Generates a unique id for correlating request/response pairs. */
    private _nextId(): string {
      return Math.random().toString(36).slice(2) + Date.now().toString(36);
    }

    /**
     * Low-level send that enqueues a resolver keyed by the generated id.
     */
    private _sendRaw<Data = unknown>(event: string, data?: Data): Promise<WSMessageResponse> {
      return new Promise((resolve, reject) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          reject(new Error("websocket_not_open"));
          return;
        }

        const id = this._nextId();
        const payload: WSRequest<Data> = { id, event, data, apiKey: this.wsApiKey };
        this._pending.set(id, resolve);
        try {
          this.ws.send(JSON.stringify(payload));
        } catch (err) {
          this._pending.delete(id);
          reject(err);
        }
      });
    }

    /** @see _sendRaw */
    async send<Data = unknown>(event: string, data?: Data): Promise<WSMessageResponse> {
      return this._sendRaw<Data>(event, data);
    }

    /** Requests subscription to `modules` updates. */
    async registerDataListener(modules: string[]): Promise<WSMessageResponse> {
      return this._sendRaw("REGISTER_DATA_LISTENER", { modules });
    }

    /** Requests unsubscription from updates. */
    async unregisterDataListener(): Promise<WSMessageResponse> {
      return this._sendRaw("UNREGISTER_DATA_LISTENER", {});
    }

    /** Fires a GET_DATA request; results are delivered via DATA_UPDATE. */
    async getData(modules: string[]): Promise<void> {
      await this._sendRaw("GET_DATA", { modules });
    }

    /** Adds a callback invoked on each DATA_UPDATE message. */
    addDataUpdateListener(listener: DataUpdateListener) {
      this._dataListeners.add(listener);
    }

    /** Removes a previously added DATA_UPDATE callback. */
    removeDataUpdateListener(listener: DataUpdateListener) {
      this._dataListeners.delete(listener);
    }
  } as unknown as Ctor<WSClientMixinClass> & TBase;
};

export default WSClientMixin;


