"use client";

import { SetupConnection } from "~/components/setup-connection";
import { useSystemBridgeConnectionStore } from "~/components/hooks/use-system-bridge-connection";
import { useSystemBridgeWS } from "~/components/hooks/use-system-bridge-ws";

export default function ClientLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { host, port, token } = useSystemBridgeConnectionStore();
  const { isConnected } = useSystemBridgeWS();

  return (
    <>
      {!host || !port || !token ? (
        <SetupConnection />
      ) : !isConnected ? (
        <div>Connecting...</div>
      ) : (
        <>{children}</>
      )}
    </>
  );
}
