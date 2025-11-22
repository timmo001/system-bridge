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
import type { SettingsScriptDefinition } from "~/lib/system-bridge/types-settings";

export function ScriptExecution() {
  const { token } = useSystemBridgeConnectionStore();
  const { settings, scriptResults, sendRequest, clearScriptResult } = useSystemBridgeWS();
  const [selectedScriptId, setSelectedScriptId] = useState<string>("");
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  const scripts = settings?.scripts.allowlist ?? [];
  const selectedScript = scripts.find((s) => s.id === selectedScriptId);
  const result = selectedScriptId ? scriptResults[selectedScriptId] : null;

  function handleExecute() {
    if (!selectedScriptId || !token) {
      toast.error("Please select a script and ensure you're connected");
      return;
    }

    setIsExecuting(true);
    sendRequest({
      id: generateUUID(),
      event: "SCRIPT_EXECUTE",
      data: { scriptID: selectedScriptId },
      token,
    });

    toast.info(`Executing script "${selectedScript?.name}"...`);

    // Reset executing state after a short delay (the SCRIPT_EXECUTING response will come back quickly)
    setTimeout(() => setIsExecuting(false), 1000);
  }

  function handleClearResult() {
    if (selectedScriptId) {
      clearScriptResult(selectedScriptId);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Execute Script</CardTitle>
          <CardDescription>
            Select a script from the allowlist and execute it. Results will appear below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={selectedScriptId} onValueChange={setSelectedScriptId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a script to execute" />
              </SelectTrigger>
              <SelectContent>
                {scripts.length === 0 ? (
                  <div className="text-muted-foreground px-2 py-1.5 text-sm">
                    No scripts available. Add scripts in the Manage tab.
                  </div>
                ) : (
                  scripts.map((script: SettingsScriptDefinition) => (
                    <SelectItem key={script.id} value={script.id}>
                      <div className="flex items-center gap-2">
                        <span>{script.name}</span>
                        <code className="bg-muted text-muted-foreground rounded px-1 text-xs">
                          {script.id}
                        </code>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              onClick={handleExecute}
              disabled={!selectedScriptId || isExecuting}
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

          {selectedScript && (
            <div className="bg-muted space-y-1 rounded-lg p-3 text-sm">
              <div>
                <span className="text-muted-foreground">Command:</span>{" "}
                <code className="text-xs">{selectedScript.command}</code>
              </div>
              <div>
                <span className="text-muted-foreground">Working Dir:</span>{" "}
                <code className="text-xs">{selectedScript.workingDir}</code>
              </div>
              {selectedScript.arguments.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Arguments:</span>{" "}
                  <code className="text-xs">{selectedScript.arguments.join(" ")}</code>
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

      {!result && selectedScriptId && (
        <Card>
          <CardContent className="text-muted-foreground pt-6 text-center">
            No results yet. Click Execute to run the selected script.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
