"use client";
import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { type z } from "zod";

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

const CONNECTION_TIMEOUT = 10000 as const;
const UPDATE_TIMEOUT = 10000 as const;

export const SystemBridgeWSContext = createContext<
  | {
      data: ModuleData | null;
      isConnected: boolean;
      settings: Settings | null;
      sendRequest: (request: WebSocketRequest) => void;
      sendRequestWithResponse: <T>(
        request: WebSocketRequest,
        schema: z.ZodSchema<T>,
      ) => Promise<T>;
      error: string | null;
      retryConnection: () => void;
    }
  | undefined
>(undefined);

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

type PendingResolver<T = unknown> = {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
  schema: z.ZodSchema<T>;
};

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
  const isSettingsUpdatePendingRef = useRef<boolean>(isSettingsUpdatePending);
  const settingsUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousConnectedState = useRef<boolean>(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendingResolvers = useRef<Record<string, PendingResolver<any>>>({});

  useEffect(() => {
    isSettingsUpdatePendingRef.current = isSettingsUpdatePending;
  }, [isSettingsUpdatePending]);

  // Toast notifications for connection status changes
  useEffect(() => {
    if (isConnected && !previousConnectedState.current) {
      toast.success("Connected to System Bridge");
    } else if (!isConnected && previousConnectedState.current && error) {
      toast.error("Disconnected from System Bridge");
    }
    previousConnectedState.current = isConnected;
  }, [isConnected, error]);

  const handleMessage = useCallback(({ data }: MessageEvent<string>) => {
    console.log("Received message:", data);

    let parsedMessage;
    try {
      parsedMessage = WebSocketResponseSchema.safeParse(JSON.parse(data));
    } catch (error) {
      console.error("Failed to parse WebSocket message:", error);
      setError("Received invalid message from server");
      return;
    }

    if (!parsedMessage.success) {
      console.error("Invalid message:", parsedMessage.error);
      setError("Received invalid message format from server");
      return;
    }

    const message = parsedMessage.data;
    if (message.id && pendingResolvers.current[message.id]) {
      console.log("Resolved pending request:", message.id);
      const parsedData = pendingResolvers.current[message.id]?.schema.safeParse(
        message.data,
      );
      if (parsedData?.success) {
        pendingResolvers.current[message.id]?.resolve(parsedData.data);
      } else {
        console.error("Invalid message data:", parsedData?.error);
        setError("Received invalid message data from server");
        pendingResolvers.current[message.id]?.reject(parsedData?.error);
      }
      delete pendingResolvers.current[message.id];
    } else {
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
          if (isSettingsUpdatePendingRef.current) {
            console.log(
              "Ignoring SETTINGS_RESULT because a settings update is pending",
            );
            setIsRequestingData(false);
            break;
          }

          const receivedSettings = message.data as Partial<Settings>;
          const mergedSettings: Settings = {
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
          setSettings((prevSettings) => {
            const updatedReceivedSettings = message.data as Partial<Settings>;
            const mergedSettings: Settings = {
              autostart:
                updatedReceivedSettings.autostart ??
                prevSettings?.autostart ??
                false,
              hotkeys:
                updatedReceivedSettings.hotkeys ?? prevSettings?.hotkeys ?? [],
              logLevel:
                updatedReceivedSettings.logLevel ??
                prevSettings?.logLevel ??
                "info",
              media: {
                directories:
                  updatedReceivedSettings.media?.directories ??
                  prevSettings?.media.directories ??
                  [],
              },
            };
            console.log("Settings updated:", mergedSettings);
            return mergedSettings;
          });
          setIsSettingsUpdatePending(false);
          if (settingsUpdateTimeoutRef.current) {
            clearTimeout(settingsUpdateTimeoutRef.current);
            settingsUpdateTimeoutRef.current = null;
          }
          break;
        case "ERROR":
          if (message.subtype === "BAD_TOKEN") {
            const errorMessage =
              "Invalid API token. Please check your connection settings and update your token.";
            setError(errorMessage);
            setIsConnected(false);
            setRetryCount(MAX_RETRIES + 1); // Stop retrying on auth error

            // Show immediate toast notification for bad token
            toast.error("Authentication Failed", {
              description:
                "Your API token is invalid or has expired. Please update your connection settings.",
              duration: 8000, // Show longer for important auth errors
            });

            wsRef.current?.close();
            return;
          } else {
            setError(`Server error: ${message.data ?? "Unknown error"}`);
          }
          break;
        default:
          console.warn("Unknown message type:", message.type);
          break;
      }
    }
  }, []);

  const connect = useCallback(() => {
    if (!host || !port || !token) return;
    if (wsRef.current) return;

    // Clear any existing connection timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }

    // Set connection timeout
    connectionTimeoutRef.current = setTimeout(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close();
        setError(
          "Connection timeout. Please check your host, port, and network connection.",
        );
        setIsConnected(false);
      }
    }, CONNECTION_TIMEOUT);

    try {
      wsRef.current = new WebSocket(
        `${ssl ? "wss" : "ws"}://${host}:${port}/api/websocket`,
      );
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      setError(
        "Failed to create connection. Please check your connection settings.",
      );
      setIsConnected(false);
      return;
    }

    wsRef.current.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      setError(null);
      setRetryCount(0); // Reset retry count on successful connection

      // Clear connection timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }

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

    wsRef.current.onclose = (event: CloseEvent) => {
      console.log("WebSocket disconnected", event);
      setIsConnected(false);

      // Clear connection timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }

      // Set specific error messages based on close code
      if (event.code === 1006) {
        setError(
          "Connection closed unexpectedly. Please check your host and port settings.",
        );
      } else if (event.code === 1002) {
        setError("Connection failed due to protocol error.");
      } else if (event.code === 1003) {
        const tokenErrorMessage =
          "Invalid API token. Please check your connection settings and update your token.";
        setError(tokenErrorMessage);
        setRetryCount(MAX_RETRIES + 1); // Stop retrying on auth error

        // Show toast notification for token error
        toast.error("Authentication Failed", {
          description:
            "Connection rejected by server. Your API token may be invalid or expired.",
          duration: 8000,
        });
      } else if (event.code !== 1000 && event.code !== 1001) {
        setError(
          `Connection closed with code ${event.code}: ${event.reason ?? "Unknown reason"}`,
        );
      }
    };

    wsRef.current.onerror = (error: Event) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);

      // Clear connection timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }

      if (retryCount === 0) {
        // Only show this error on first attempt to avoid spam
        setError(
          "Connection failed. Please check your host, port, and network connection.",
        );
      }
    };

    wsRef.current.onmessage = handleMessage;

    return () => {
      wsRef.current?.close();
      wsRef.current = null;
      setIsConnected(false);
      if (settingsUpdateTimeoutRef.current) {
        clearTimeout(settingsUpdateTimeoutRef.current);
        settingsUpdateTimeoutRef.current = null;
      }
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    };
  }, [host, port, ssl, token, retryCount, isRequestingData, handleMessage]);

  function sendRequest(request: WebSocketRequest) {
    if (!wsRef.current) return;
    if (wsRef.current.readyState !== WebSocket.OPEN) return;
    if (!request.token) throw new Error("No token found");

    if (request.event === "UPDATE_SETTINGS") {
      setIsSettingsUpdatePending(true);
      if (settingsUpdateTimeoutRef.current) {
        clearTimeout(settingsUpdateTimeoutRef.current);
      }
      settingsUpdateTimeoutRef.current = setTimeout(() => {
        setIsSettingsUpdatePending(false);
        setError(
          "Settings update timed out. Please try again or check your connection.",
        );
      }, UPDATE_TIMEOUT);
    }

    console.log("Sending request:", request);
    wsRef.current.send(JSON.stringify(request));
  }

  function sendRequestWithResponse<T>(
    request: WebSocketRequest,
    schema: z.ZodSchema<T>,
  ): Promise<T> {
    return new Promise(
      (
        resolve: (value: T | PromiseLike<T>) => void,
        reject: (reason?: unknown) => void,
      ) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          reject(new Error("WebSocket is not connected"));
          return;
        }
        if (!request.id) {
          reject(new Error("Request must have an id"));
          return;
        }
        console.log("Sending request with response:", request.id);
        pendingResolvers.current[request.id] = { resolve, reject, schema };
        try {
          wsRef.current.send(JSON.stringify(request));
        } catch (e) {
          delete pendingResolvers.current[request.id];
          reject(e instanceof Error ? e : new Error("Unknown error"));
        }
        setTimeout(() => {
          if (pendingResolvers.current[request.id]) {
            delete pendingResolvers.current[request.id];
            reject(new Error("WebSocket response timed out"));
          }
        }, UPDATE_TIMEOUT);
      },
    );
  }

  useEffect(() => {
    if (!host || !port || !token) return;
    if (isConnected) return;

    console.log("WebSocket is not connected");

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      if (retryCount < MAX_RETRIES) {
        console.log(
          `Attempting to reconnect... (${retryCount + 1}/${MAX_RETRIES})`,
        );
        setRetryCount((prev) => prev + 1);
        wsRef.current = null;
        connect();
      } else {
        setError(
          `Failed to connect after ${MAX_RETRIES} attempts. Please check your connection settings and try again.`,
        );
      }
    }, RETRY_DELAY);
  }, [connect, isConnected, retryCount, host, port, token]);

  const retryConnection = useCallback(() => {
    setError(null);
    setRetryCount(0);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    connect();
  }, [connect]);

  return (
    <SystemBridgeWSContext.Provider
      value={{
        data,
        isConnected,
        settings,
        sendRequest,
        sendRequestWithResponse,
        error,
        retryConnection,
      }}
    >
      {children}
    </SystemBridgeWSContext.Provider>
  );
}
