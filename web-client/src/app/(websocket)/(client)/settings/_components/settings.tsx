"use client";

import { useSystemBridgeWS } from "~/components/hooks/use-system-bridge-ws";

export function Settings() {
  const { settings } = useSystemBridgeWS();

  return (
    <div>
      <h1>Settings</h1>
      <pre>{JSON.stringify(settings, null, 2)}</pre>
    </div>
  );
}
