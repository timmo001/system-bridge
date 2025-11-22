"use client";

import { useEffect, useState } from "react";
import {
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  useQueryState,
} from "nuqs";

import { SetupConnection } from "~/components/setup-connection";
import { useSystemBridgeConnectionStore } from "~/components/hooks/use-system-bridge-connection";
import { SystemBridgeWSProvider } from "~/components/providers/system-bridge-ws-provider";
import { ConnectionStatus } from "~/components/connection-status";

export default function WebSocketLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [hostInput] = useQueryState("host", parseAsString);
  const [portInput] = useQueryState("port", parseAsInteger);
  const [apiKeyInput] = useQueryState("apiKey", parseAsString);
  const [sslInput] = useQueryState("ssl", parseAsBoolean.withDefault(false));

  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  const { host, port, token, setAll } = useSystemBridgeConnectionStore();

  useEffect(() => {
    console.debug("Query params:", {
      hostInput,
      portInput,
      apiKeyInput,
      sslInput,
    });
    if (hostInput && portInput && apiKeyInput) {
      void setAll({
        host: hostInput,
        port: portInput,
        ssl: sslInput,
        token: apiKeyInput,
      }).then(() => {
        console.debug("Set store from query params", {
          host: hostInput,
          port: portInput,
          ssl: sslInput,
          token: apiKeyInput,
        });
        setIsHydrated(true);
      });
    } else {
      setIsHydrated(true);
    }
  }, [apiKeyInput, hostInput, portInput, setAll, sslInput]);

  return (
    <SystemBridgeWSProvider>
      {!isHydrated ? (
        <div>Loading...</div>
      ) : !host || !port || !token ? (
        <SetupConnection />
      ) : (
        <>
          <ConnectionStatus />
          {children}
        </>
      )}
    </SystemBridgeWSProvider>
  );
}
