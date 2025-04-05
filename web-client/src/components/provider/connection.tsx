"use client";

import { useEffect, useState } from "react";

import { SetupConnection } from "~/components/setup-connection";
import { useSystemBridgeConnectionStore } from "~/components/hooks/use-system-bridge-connection";
import { useSystemBridgeWS } from "~/components/hooks/use-system-bridge-ws";

export function ConnectionProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  const { host, port, token } = useSystemBridgeConnectionStore();
  const { isConnected } = useSystemBridgeWS();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return (
    <>
      {!isHydrated ? (
        <div>Loading...</div>
      ) : !host || !port || !token ? (
        <SetupConnection />
      ) : !isConnected ? (
        <div>Connecting...</div>
      ) : (
        <>{children}</>
      )}
    </>
  );
}
