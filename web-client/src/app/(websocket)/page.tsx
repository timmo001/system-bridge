"use client";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { 
  Database, 
  Settings, 
  Wifi, 
  Shield, 
  Server,
  Monitor,
  Home
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { ButtonLink } from "~/components/ui/button-link";
import { useSystemBridgeConnectionStore } from "~/components/hooks/use-system-bridge-connection";

export default function HomePage() {
  const [hostInput] = useQueryState("host", parseAsString);
  const [portInput] = useQueryState("port", parseAsInteger);
  const [apiKeyInput] = useQueryState("apiKey", parseAsString);

  const { host, port, token, ssl } = useSystemBridgeConnectionStore();

  return (
    <div className="container max-w-4xl mx-auto space-y-8">
      {/* Welcome Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-primary/10 p-4 rounded-full">
            <Home className="h-12 w-12 text-primary" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-foreground">Welcome to System Bridge</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Your bridge to system monitoring and automation. Access real-time system data, 
          configure settings, and connect with external applications.
        </p>
      </div>

      {/* Main Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-500/10 p-3 rounded-full group-hover:bg-blue-500/20 transition-colors">
                <Monitor className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            <CardTitle className="text-xl">System Dashboard</CardTitle>
            <CardDescription>
              View real-time system metrics, performance data, and hardware information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ButtonLink 
              buttonClassName="w-full" 
              title="View Dashboard" 
              href="/data" 
            />
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-green-500/10 p-3 rounded-full group-hover:bg-green-500/20 transition-colors">
                <Settings className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <CardTitle className="text-xl">Settings</CardTitle>
            <CardDescription>
              Configure system preferences, manage connections, and customize your setup
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ButtonLink 
              buttonClassName="w-full" 
              title="Open Settings" 
              href="/settings" 
            />
          </CardContent>
        </Card>
      </div>

      {/* Connection Setup Card */}
      {(!hostInput || !portInput || !apiKeyInput) && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-orange-500/10 p-3 rounded-full">
                <Wifi className="h-8 w-8 text-orange-500" />
              </div>
            </div>
            <CardTitle className="text-xl text-orange-800 dark:text-orange-200">
              Setup Required
            </CardTitle>
            <CardDescription className="text-orange-700 dark:text-orange-300">
              Configure your connection settings to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ButtonLink
              buttonClassName="w-full bg-orange-500 hover:bg-orange-600 text-white"
              title="Configure Connection"
              href="/connection"
            />
          </CardContent>
        </Card>
      )}

      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <Server className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Connection Status</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Host:</span>
                <span className="text-muted-foreground">{host || 'Not configured'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Port:</span>
                <span className="text-muted-foreground">{port || 'Not configured'}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">SSL:</span>
                <span className="text-muted-foreground">{ssl ? "Enabled" : "Disabled"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">API Key:</span>
                <span className="text-muted-foreground">
                  {token ? "Configured" : "Not configured"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
