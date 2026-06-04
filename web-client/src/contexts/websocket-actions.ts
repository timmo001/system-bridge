import { createContext } from "@lit/context";
import type { z } from "zod";

import type { WebSocketRequest } from "~/lib/system-bridge/types-websocket";

export interface WebSocketActions {
  sendRequest: (request: WebSocketRequest) => void;
  sendRequestWithResponse: <T>(
    request: WebSocketRequest,
    schema: z.ZodType<T>,
  ) => Promise<T>;
  sendCommandExecute: (
    messageId: string,
    commandId: string,
    token: string,
  ) => void;
}

export const websocketActionsContext =
  createContext<WebSocketActions>("websocket-actions");
