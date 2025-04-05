"use client";
import { createContext, useEffect, useRef, useState } from "react";

import { useSystemBridgeConnectionStore } from "~/components/hooks/use-system-bridge-connection";

type WebSocketMessage = {
  type: string;
  payload: unknown;
};

export const SystemBridgeWSContext = createContext<
  | {
      isConnected: boolean;
      sendMessage: (message: WebSocketMessage) => void;
    }
  | undefined
>(undefined);

export function SystemBridgeWSProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { host, port, ssl } = useSystemBridgeConnectionStore();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!host || !port) return;

    const ws = new WebSocket(
      `${ssl ? "wss" : "ws"}://${host}:${port}/api/websocket`,
    );

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [host, port, ssl]);

  const sendMessage = (message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log("Sending message:", message);
      wsRef.current.send(JSON.stringify(message));
    }
  };

  return (
    <SystemBridgeWSContext.Provider value={{ isConnected, sendMessage }}>
      {children}
    </SystemBridgeWSContext.Provider>
  );
}
