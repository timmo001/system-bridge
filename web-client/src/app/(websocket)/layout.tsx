"use client";

import { useEffect, useState } from "react";

import { SetupConnection } from "~/components/setup-connection";
import { useSystemBridgeConnectionStore } from "~/components/hooks/use-system-bridge-connection";
import { SystemBridgeWSProvider } from "~/components/providers/system-bridge-ws-provider";

export default function WebSocketLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  const { host, port, token } = useSystemBridgeConnectionStore();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

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
