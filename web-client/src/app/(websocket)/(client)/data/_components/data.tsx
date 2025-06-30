"use client";

import { useState } from "react";
import { Eye, Code, Activity } from "lucide-react";

import { Modules } from "~/lib/system-bridge/types-modules";
import { CodeBlock } from "~/components/ui/code-block";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { useSystemBridgeWS } from "~/components/hooks/use-system-bridge-ws";
import { DashboardCards } from "./dashboard-cards";

export function Data() {
  const { data, isConnected, error } = useSystemBridgeWS();
  const [viewMode, setViewMode] = useState<"dashboard" | "raw">("dashboard");

  return (
    <div className="container max-w-7xl mx-auto space-y-6">
      {/* Header with Status and View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-full">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">System Dashboard</h1>
            <div className="flex items-center gap-2 mt-1">
              <div
                className={`h-2 w-2 rounded-full ${
                  isConnected
                    ? "bg-green-500"
                    : error
                      ? "bg-red-500"
                      : "bg-yellow-500"
                }`}
              />
              <span className="text-sm text-muted-foreground">
                {isConnected
                  ? "Connected to System Bridge"
                  : error
                    ? "Connection Error"
                    : "Connecting..."}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "dashboard" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("dashboard")}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            Dashboard
          </Button>
          <Button
            variant={viewMode === "raw" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("raw")}
            className="gap-2"
          >
            <Code className="h-4 w-4" />
            Raw Data
          </Button>
        </div>
      </div>

      {/* Content */}
      {viewMode === "dashboard" ? (
        <div className="space-y-6">
          {isConnected && data ? (
            <DashboardCards data={data} />
          ) : (
            <div className="text-center py-12">
              <div className="bg-muted/50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Activity className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {error ? "Connection Error" : "Connecting..."}
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {error 
                  ? "Unable to connect to System Bridge. Please check your connection settings." 
                  : "Establishing connection to System Bridge..."}
              </p>
            </div>
          )}
        </div>
      ) : (
        <Tabs className="w-full" defaultValue="system">
          <TabsList className="grid w-full grid-cols-6 lg:grid-cols-11">
            {Modules.map((module) => (
              <TabsTrigger 
                key={module} 
                value={module}
                className="text-xs"
              >
                {module.charAt(0).toUpperCase() + module.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>
          {Modules.map((module) => (
            <TabsContent key={module} value={module} className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">
                    {module.charAt(0).toUpperCase() + module.slice(1)} Data
                  </h3>
                </div>
                <CodeBlock language="json">
                  {JSON.stringify(data?.[module], null, 2)}
                </CodeBlock>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
