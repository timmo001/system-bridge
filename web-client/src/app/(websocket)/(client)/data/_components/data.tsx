"use client";

import { Modules } from "~/lib/system-bridge/types-modules";
import { CodeBlock } from "~/components/ui/code-block";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useSystemBridgeWS } from "~/components/hooks/use-system-bridge-ws";

export function Data() {
  const { data } = useSystemBridgeWS();

  return (
    <Tabs className="container" defaultValue="system">
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
