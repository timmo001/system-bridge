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

export default function WebSocketLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [hostInput] = useQueryState("host", parseAsString);
  const [portInput] = useQueryState("port", parseAsInteger);
  const [apiKeyInput] = useQueryState("apiKey", parseAsString);
  const [sslInput] = useQueryState("ssl", parseAsBoolean.withDefault(false));

  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  const { host, port, token, setHost, setPort, setToken, setSsl } =
    useSystemBridgeConnectionStore();

  useEffect(() => {
    if (hostInput && portInput && apiKeyInput && sslInput) {
      setHost(hostInput);
      setPort(portInput);
      setToken(apiKeyInput);
      setSsl(sslInput);
    }
    setIsHydrated(true);
  }, [
    apiKeyInput,
    hostInput,
    portInput,
    setHost,
    setPort,
    setSsl,
    setToken,
    sslInput,
  ]);

  return (
    <SystemBridgeWSProvider>
      {!isHydrated ? (
        <div>Loading...</div>
      ) : !host || !port || !token ? (
        <SetupConnection />
      ) : (
        <>{children}</>
      )}
    </SystemBridgeWSProvider>
  );
}
