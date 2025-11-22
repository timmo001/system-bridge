"use client";
import { useContext } from "react";

import { SystemBridgeWSContext } from "~/components/providers/system-bridge-ws-provider";

export function useSystemBridgeWS() {
  const context = useContext(SystemBridgeWSContext);
  if (context === undefined) {
    throw new Error(
      "useSystemBridgeWS must be used within a SystemBridgeWSProvider",
    );
  }
  return context;
}
