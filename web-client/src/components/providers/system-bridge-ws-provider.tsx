"use client";
import { createContext, useCallback, useEffect, useRef, useState } from "react";

import { generateUUID } from "~/lib/utils";
import { type Settings } from "~/lib/system-bridge/types-settings";
import {
  WebSocketResponseSchema,
  type WebSocketRequest,
} from "~/lib/system-bridge/types-websocket";
import { useSystemBridgeConnectionStore } from "~/components/hooks/use-system-bridge-connection";

export const SystemBridgeWSContext = createContext<
  | {
      isConnected: boolean;
      settings: Settings | null;
      sendRequest: (request: WebSocketRequest) => void;
    }
  | undefined
>(undefined);

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export function SystemBridgeWSProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { host, port, ssl, token } = useSystemBridgeConnectionStore();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!host || !port || !token) return;
    if (wsRef.current) return;

    wsRef.current = new WebSocket(
      `${ssl ? "wss" : "ws"}://${host}:${port}/api/websocket`,
    );

    wsRef.current.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);

      if (!settings) {
        sendRequest({
          id: generateUUID(),
          event: "GET_SETTINGS",
          token: token,
        });
      }
    };

    wsRef.current.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
    };

    wsRef.current.onerror = (error: Event) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };

    wsRef.current.onmessage = handleMessage;

    return () => {
      wsRef.current?.close();
    };
  }, [host, port, settings, ssl, token]);

  useEffect(() => connect(), [connect]);

  function sendRequest(request: WebSocketRequest) {
    if (!wsRef.current) return;
    if (wsRef.current.readyState !== WebSocket.OPEN) return;
    if (!request.token) throw new Error("No token found");

    console.log("Sending request:", request);
    wsRef.current.send(JSON.stringify(request));
  }

  function handleMessage({ data }: MessageEvent<string>) {
    console.log("Received message:", data);

    const parsedMessage = WebSocketResponseSchema.safeParse(JSON.parse(data));

    if (!parsedMessage.success) {
      console.error("Invalid message:", parsedMessage.error);
      return;
    }

    const message = parsedMessage.data;
    switch (message.type) {
      case "SETTINGS_RESULT":
        setSettings(message.data as Settings);
        break;
      default:
        console.warn("Unknown message type:", message.type);
        break;
    }
  }

  useEffect(() => {
    if (!host || !port || !token) return;

    if (!isConnected) {
      console.log("WebSocket is not connected");
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        console.log(
          `Attempting to reconnect... (${retryCount + 1}/${MAX_RETRIES})`,
        );
        wsRef.current = null;
        connect();
      }, RETRY_DELAY);
    }
  }, [connect, isConnected, retryCount, host, port, token]);

  return (
    <SystemBridgeWSContext.Provider
      value={{ isConnected, settings, sendRequest }}
    >
      {children}
    </SystemBridgeWSContext.Provider>
  );
}
