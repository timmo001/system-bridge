"use client";
import { useState } from "react";
import { Play, X, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { useSystemBridgeWS } from "~/components/hooks/use-system-bridge-ws";
import { useSystemBridgeConnectionStore } from "~/components/hooks/use-system-bridge-connection";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { generateUUID } from "~/lib/utils";
import type { SettingsCommandDefinition } from "~/lib/system-bridge/types-settings";

export function CommandExecution() {
  const { token } = useSystemBridgeConnectionStore();
  const { settings, commandResults, sendRequest, clearCommandResult } = useSystemBridgeWS();
  const [selectedCommandId, setSelectedCommandId] = useState<string>("");
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  const commands = settings?.commands.allowlist ?? [];
  const selectedCommand = commands.find((s) => s.id === selectedCommandId);
  const result = selectedCommandId ? commandResults[selectedCommandId] : null;

  function handleExecute() {
    if (!selectedCommandId || !token) {
      toast.error("Please select a command and ensure you're connected");
      return;
    }

    setIsExecuting(true);
    sendRequest({
      id: generateUUID(),
      event: "COMMAND_EXECUTE",
      data: { commandID: selectedCommandId },
      token,
    });

    toast.info(`Executing command "${selectedCommand?.name}"...`);

    // Reset executing state after a short delay (the COMMAND_EXECUTING response will come back quickly)
    setTimeout(() => setIsExecuting(false), 1000);
  }

  function handleClearResult() {
    if (selectedCommandId) {
      clearCommandResult(selectedCommandId);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Execute Command</CardTitle>
          <CardDescription>
            Select a command from the allowlist and execute it. Results will appear below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={selectedCommandId} onValueChange={setSelectedCommandId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a command to execute" />
              </SelectTrigger>
              <SelectContent>
                {commands.length === 0 ? (
                  <div className="text-muted-foreground px-2 py-1.5 text-sm">
                    No commands available. Add commands in the Manage tab.
                  </div>
                ) : (
                  commands.map((command: SettingsCommandDefinition) => (
                    <SelectItem key={command.id} value={command.id}>
                      <div className="flex items-center gap-2">
                        <span>{command.name}</span>
                        <code className="bg-muted text-muted-foreground rounded px-1 text-xs">
                          {command.id}
                        </code>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              onClick={handleExecute}
              disabled={!selectedCommandId || isExecuting}
              className="min-w-[120px]"
            >
              {isExecuting ? (
                <>Executing...</>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Execute
                </>
              )}
            </Button>
          </div>

          {selectedCommand && (
            <div className="bg-muted space-y-1 rounded-lg p-3 text-sm">
              <div>
                <span className="text-muted-foreground">Command:</span>{" "}
                <code className="text-xs">{selectedCommand.command}</code>
              </div>
              <div>
                <span className="text-muted-foreground">Working Dir:</span>{" "}
                <code className="text-xs">{selectedCommand.workingDir}</code>
              </div>
              {selectedCommand.arguments.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Arguments:</span>{" "}
                  <code className="text-xs">{selectedCommand.arguments.join(" ")}</code>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <CardTitle className="flex items-center gap-2">
                  Results
                  {result.error ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : result.exitCode === 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                </CardTitle>
                <CardDescription>
                  Exit Code: <code className={result.exitCode === 0 ? "text-green-600" : "text-red-600"}>{result.exitCode}</code>
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClearResult}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.error && (
              <div>
                <h4 className="mb-2 font-semibold text-red-600">Error</h4>
                <pre className="bg-muted overflow-x-auto rounded-lg p-3 text-sm text-red-600">
                  {result.error}
                </pre>
              </div>
            )}

            <div>
              <h4 className="mb-2 font-semibold">Standard Output</h4>
              {result.stdout ? (
                <pre className="bg-muted overflow-x-auto rounded-lg p-3 font-mono text-sm">
                  {result.stdout}
                </pre>
              ) : (
                <div className="text-muted-foreground text-sm italic">(empty)</div>
              )}
            </div>

            <div>
              <h4 className="mb-2 font-semibold">Standard Error</h4>
              {result.stderr ? (
                <pre className="bg-muted overflow-x-auto rounded-lg p-3 font-mono text-sm text-yellow-600">
                  {result.stderr}
                </pre>
              ) : (
                <div className="text-muted-foreground text-sm italic">(empty)</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!result && selectedCommandId && (
        <Card>
          <CardContent className="text-muted-foreground pt-6 text-center">
            No results yet. Click Execute to run the selected command.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
