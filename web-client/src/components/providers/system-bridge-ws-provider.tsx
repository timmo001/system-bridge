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
  const [isSettingsUpdatePending, setIsSettingsUpdatePending] =
    useState<boolean>(false);

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const handleMessage = useCallback(
    ({ data }: MessageEvent<string>) => {
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
          // Only update settings if no update is pending
          if (isSettingsUpdatePending) {
            console.log(
              "Ignoring SETTINGS_RESULT because a settings update is pending",
            );
            setIsRequestingData(false);
            break;
          }

          // Merge received settings with defaults to ensure logLevel is always present
          const receivedSettings = message.data as Partial<Settings>;
          const mergedSettings: Settings = {
            api: {
              token: receivedSettings.api?.token ?? "",
              port: receivedSettings.api?.port ?? 9170,
            },
            autostart: receivedSettings.autostart ?? false,
            hotkeys: receivedSettings.hotkeys ?? [],
            logLevel: receivedSettings.logLevel ?? "info",
            media: {
              directories: receivedSettings.media?.directories ?? [],
            },
          };
          console.log("Settings received:", mergedSettings);
          setSettings(mergedSettings);
          setIsRequestingData(false);
          break;
        case "DATA_LISTENER_REGISTERED":
          console.log("Data listener registered");
          break;
        case "SETTINGS_UPDATED":
          // Merge updated settings with defaults to ensure logLevel is always present
          const updatedReceivedSettings = message.data as Partial<Settings>;
          const updatedMergedSettings: Settings = {
            api: {
              token: updatedReceivedSettings.api?.token ?? "",
              port: updatedReceivedSettings.api?.port ?? 9170,
            },
            autostart: updatedReceivedSettings.autostart ?? false,
            hotkeys: updatedReceivedSettings.hotkeys ?? [],
            logLevel: updatedReceivedSettings.logLevel ?? "info",
            media: {
              directories: updatedReceivedSettings.media?.directories ?? [],
            },
          };
          setSettings(updatedMergedSettings);
          setIsSettingsUpdatePending(false);
          break;
        default:
          console.warn("Unknown message type:", message.type);
          break;
      }
    },
    [isSettingsUpdatePending],
  );

  const connect = useCallback(() => {
    if (!host || !port || !token) return;
    if (wsRef.current) return;

    wsRef.current = new WebSocket(
      `${ssl ? "wss" : "ws"}://${host}:${port}/api/websocket`,
    );

    wsRef.current.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

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
  }, [host, isRequestingData, port, ssl, token, handleMessage]);

  function sendRequest(request: WebSocketRequest) {
    if (!wsRef.current) return;
    if (wsRef.current.readyState !== WebSocket.OPEN) return;
    if (!request.token) throw new Error("No token found");

    // If this is a settings update, set pending flag
    if (request.event === "UPDATE_SETTINGS") {
      setIsSettingsUpdatePending(true);
    }

    console.log("Sending request:", request);
    wsRef.current.send(JSON.stringify(request));
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
      if (retryCount <= MAX_RETRIES) {
        console.log(
          `Attempting to reconnect... (${retryCount}/${MAX_RETRIES})`,
        );
        wsRef.current = null;
        connect();
      }
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
