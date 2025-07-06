"use client";
import { useEffect, useState } from "react";
import { Wifi, Settings } from "lucide-react";

import { SetupConnection } from "~/components/setup-connection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Callout } from "~/components/ui/callout";

export function Connection() {
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-full">
          <Wifi className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Connection Settings</h1>
          <p className="text-muted-foreground">
            Configure your connection to System Bridge
          </p>
        </div>
      </div>

      {/* Information Card */}
      <Callout type="info">
        <div className="space-y-2">
          <p className="font-medium">Before you start:</p>
          <ul className="text-sm space-y-1 ml-4 list-disc">
            <li>Make sure System Bridge is running on your target system</li>
            <li>You can find your API token in the System Bridge logs or settings file</li>
            <li>For local connections, keep SSL disabled</li>
            <li>The default port is 9170</li>
          </ul>
        </div>
      </Callout>

      {/* Connection Form Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Connection Details</CardTitle>
          </div>
          <CardDescription>
            Enter your System Bridge server details to establish a connection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SetupConnection />
        </CardContent>
      </Card>
    </div>
  );
}
