"use client";
import { createContext, useCallback, useEffect, useRef, useState } from "react";

import { generateUUID } from "~/lib/utils";
import {
  DefaultModuleData,
  Modules,
  type ModuleData,
} from "~/lib/system-bridge/types-modules";
import { type Settings } from "~/lib/system-bridge/types-settings";
import {
  WebSocketResponseSchema,
  type WebSocketRequest,
} from "~/lib/system-bridge/types-websocket";
import { useSystemBridgeConnectionStore } from "~/components/hooks/use-system-bridge-connection";

export const SystemBridgeWSContext = createContext<
  | {
      data: ModuleData | null;
      isConnected: boolean;
      settings: Settings | null;
      sendRequest: (request: WebSocketRequest) => void;
    }
  | undefined
>(undefined);

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

export function SystemBridgeWSProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { host, port, ssl, token } = useSystemBridgeConnectionStore();
  const [data, setData] = useState<ModuleData>(DefaultModuleData);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isRequestingData, setIsRequestingData] = useState<boolean>(false);

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (!host || !port || !token) return;
    if (wsRef.current) return;

    wsRef.current = new WebSocket(
      `${ssl ? "wss" : "ws"}://${host}:${port}/api/websocket`,
    );

    wsRef.current.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);

      if (!isRequestingData) {
        setIsRequestingData(true);
        sendRequest({
          id: generateUUID(),
          event: "GET_SETTINGS",
          token: token,
        });

        sendRequest({
          id: generateUUID(),
          event: "GET_DATA",
          data: { modules: Modules },
          token: token,
        });

        sendRequest({
          id: generateUUID(),
          event: "REGISTER_DATA_LISTENER",
          data: { modules: Modules },
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
      wsRef.current = null;
      setIsConnected(false);
    };
  }, [host, isRequestingData, port, ssl, token]);

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
      case "DATA_UPDATE":
        if (!message.module) {
          console.error("No module found in data update");
          return;
        }

        if (!message.data) {
          console.error("No data found in data update");
          return;
        }

        console.log("Data received:", message.data);
        setData((prev) => ({
          ...prev,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          [message.module as string]: message.data,
        }));
        setIsRequestingData(false);
        break;
      case "SETTINGS_RESULT":
        const newSettings = message.data as Settings;
        console.log("Settings received:", newSettings);
        setSettings(newSettings);
        setIsRequestingData(false);
        break;
      case "DATA_LISTENER_REGISTERED":
        console.log("Data listener registered");
        break;
      case "SETTINGS_UPDATED":
        console.log("Settings updated:", message.data);
        const updatedSettings = message.data as Settings;
        setSettings(updatedSettings);
        break;
      default:
        console.warn("Unknown message type:", message.type);
        break;
    }
  }

  useEffect(() => {
    if (!host || !port || !token) return;
    if (isConnected) return;

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
  }, [connect, isConnected, retryCount, host, port, token]);

  return (
    <SystemBridgeWSContext.Provider
      value={{ data, isConnected, settings, sendRequest }}
    >
      {children}
    </SystemBridgeWSContext.Provider>
  );
}
