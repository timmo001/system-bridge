"use client";

import { useSystemBridgeWS } from "~/components/hooks/use-system-bridge-ws";
import { CommandExecutor } from "~/components/ui/command-executor";

export function Commands() {
  const { settings } = useSystemBridgeWS();

  if (!settings) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Loading Settings...</h3>
          <p className="text-muted-foreground">
            Please wait while we load your command settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CommandExecutor commands={settings.commands.commands} />
    </div>
  );
}