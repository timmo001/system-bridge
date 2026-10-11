import type { Redacted } from "effect";

export interface ConnectionOptions {
  readonly host: string;
  readonly port: number;
  /** Use `https` and `wss`. Defaults to false. */
  readonly secure?: boolean;
  readonly token: Redacted.Redacted;
}

export const httpUrl = (options: ConnectionOptions): string =>
  `${options.secure === true ? "https" : "http"}://${options.host}:${options.port}`;

export const websocketUrl = (options: ConnectionOptions): string =>
  `${options.secure === true ? "wss" : "ws"}://${options.host}:${options.port}/api/websocket`;
