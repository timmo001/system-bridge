"use client";

import { Modules } from "~/lib/system-bridge/types-modules";
import { CodeBlock } from "~/components/ui/code-block";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useSystemBridgeWS } from "~/components/hooks/use-system-bridge-ws";

export function Data() {
  const { data, isConnected, error } = useSystemBridgeWS();

  return (
    <Tabs className="container" defaultValue="system">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`h-3 w-3 rounded-full ${
              isConnected
                ? "bg-green-500"
                : error
                  ? "bg-red-500"
                  : "bg-yellow-500"
            }`}
            title={
              isConnected
                ? "Connected"
                : error
                  ? "Connection Error"
                  : "Connecting..."
            }
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {isConnected
              ? "Connected to System Bridge"
              : error
                ? "Connection Error"
                : "Connecting..."}
          </span>
        </div>
      </div>
      <TabsList className="w-full">
        {Modules.map((module) => (
          <TabsTrigger key={module} value={module}>
            {module.charAt(0).toUpperCase() + module.slice(1)}
          </TabsTrigger>
        ))}
      </TabsList>
      {Modules.map((module) => (
        <TabsContent key={module} value={module}>
          <CodeBlock language="json">
            {JSON.stringify(data?.[module], null, 2)}
          </CodeBlock>
        </TabsContent>
      ))}
    </Tabs>
  );
}
