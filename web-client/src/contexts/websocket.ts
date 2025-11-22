import { createContext } from "@lit/context";
import { type z } from "zod";

import type { ModuleData } from "~/lib/system-bridge/types-modules";
import type { Settings } from "~/lib/system-bridge/types-settings";
import type { WebSocketRequest } from "~/lib/system-bridge/types-websocket";

export interface WebSocketState {
  data: ModuleData | null;
  isConnected: boolean;
  settings: Settings | null;
  error: string | null;
  sendRequest: (request: WebSocketRequest) => void;
  sendRequestWithResponse: <T>(
    request: WebSocketRequest,
    schema: z.ZodType<T>,
  ) => Promise<T>;
  retryConnection: () => void;
}

export const websocketContext = createContext<WebSocketState>("websocket");

export const CONNECTION_TIMEOUT = 10000;
export const UPDATE_TIMEOUT = 10000;
export const MAX_RETRIES = 3;
export const RETRY_DELAY = 2000;
