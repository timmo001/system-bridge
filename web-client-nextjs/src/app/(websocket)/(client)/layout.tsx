"use client";

import { useSystemBridgeWS } from "~/components/hooks/use-system-bridge-ws";

export default function WebSocketClientLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { isConnected } = useSystemBridgeWS();

  return <>{!isConnected ? <div>Connecting...</div> : <>{children}</>}</>;
}
