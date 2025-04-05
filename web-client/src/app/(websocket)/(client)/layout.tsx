"use client";

import { SystemBridgeWSProvider } from "~/components/providers/system-bridge-ws-provider";
import { useSystemBridgeWS } from "~/components/hooks/use-system-bridge-ws";

export default function WebSocketClientLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { isConnected } = useSystemBridgeWS();

  return (
    <SystemBridgeWSProvider>
      {!isConnected ? <div>Connecting...</div> : <>{children}</>}
    </SystemBridgeWSProvider>
  );
}
