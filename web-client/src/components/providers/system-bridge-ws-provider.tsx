"use client";
import { createContext, useEffect, useRef, useState } from "react";

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

export function SystemBridgeWSProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { host, port, ssl, token } = useSystemBridgeConnectionStore();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [settings, setSettings] = useState<Settings | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  useEffect(() => {
    if (!host || !port) return;

    const ws = new WebSocket(
      `${ssl ? "wss" : "ws"}://${host}:${port}/api/websocket`,
    );

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);

      getSettings();
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
    };

    ws.onerror = (error: Event) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };

    ws.onmessage = handleMessage;

    function getSettings() {
      if (!token) throw new Error("No token found");

      sendRequest({
        id: generateUUID(),
        event: "GET_SETTINGS",
        token: token,
      });
    }

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [host, port, ssl, token]);

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

  return (
    <SystemBridgeWSContext.Provider
      value={{ isConnected, settings, sendRequest }}
    >
      {children}
    </SystemBridgeWSContext.Provider>
  );
}
