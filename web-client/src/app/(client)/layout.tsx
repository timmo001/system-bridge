"use client";

import { useSystemBridgeConnectionStore } from "~/components/hooks/use-system-bridge-connection";
import { useSystemBridgeWS } from "~/components/hooks/use-system-bridge-ws";

export default function ClientLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { host, port } = useSystemBridgeConnectionStore();
  const { isConnected } = useSystemBridgeWS();

  return (
    <>
      {!host || !port ? (
        <div>No connection</div>
      ) : !isConnected ? (
        <div>Connecting...</div>
      ) : (
        <>{children}</>
      )}
    </>
  );
}
