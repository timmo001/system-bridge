export { httpUrl, websocketUrl, type ConnectionOptions } from "./connection.js";

export * from "./errors.js";

export * from "./generated/modules.js";

export * from "./protocol.js";

export {
  SystemBridgeApi,
  SystemBridgeHttp,
  type HttpError,
  type HttpOptions,
} from "./http.js";

export {
  SystemBridgeWebSocket,
  type PowerAction,
  type WebSocketError,
  type WebSocketOptions,
} from "./websocket.js";
