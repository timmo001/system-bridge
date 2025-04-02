"use client";
import { useEffect, useRef, useState } from "react";
import { useSystemBridgeConnectionStore } from "~/components/hooks/use-system-bridge-connection";

interface WebSocketMessage {
  type: string;
  payload: unknown;
}

export function useSystemBridgeWS() {
  const { host, port, ssl } = useSystemBridgeConnectionStore();

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!host || !port) return;

    const ws = new WebSocket(
      `${ssl ? "wss" : "ws"}://${host}:${port}/api/websocket`,
    );

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onclose = () => {
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
      wsRef.current.send(JSON.stringify(message));
    }
  };

  return {
    isConnected,
    sendMessage,
  };
}
