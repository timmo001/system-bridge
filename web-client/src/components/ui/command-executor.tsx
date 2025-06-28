"use client";

import { useState } from "react";
import { Play, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "./button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./card";
import { useSystemBridgeWS } from "~/components/hooks/use-system-bridge-ws";
import { useSystemBridgeConnectionStore } from "~/components/hooks/use-system-bridge-connection";
import { generateUUID } from "~/lib/utils";
import { type SettingsCommand } from "~/lib/system-bridge/types-settings";

interface CommandExecutorProps {
  commands: SettingsCommand[];
}

interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  error?: string;
}

interface ExecutionResult {
  name: string;
  command: string;
  args: string[];
  result: CommandResult;
}

export function CommandExecutor({ commands }: CommandExecutorProps) {
  const { token } = useSystemBridgeConnectionStore();
  const { sendRequest } = useSystemBridgeWS();
  const [executing, setExecuting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, ExecutionResult>>({});

  const executeCommand = async (commandName: string) => {
    if (!token) {
      toast.error("No token found");
      return;
    }

    setExecuting(commandName);

    try {
      const response = await sendRequest({
        id: generateUUID(),
        event: "RUN_COMMAND",
        data: { name: commandName },
        token,
      });

      if (response.type === "COMMAND_EXECUTED") {
        const result = response.data as ExecutionResult;
        setResults((prev) => ({ ...prev, [commandName]: result }));

        if (result.result.exitCode === 0) {
          toast.success(`Command "${commandName}" executed successfully`);
        } else {
          toast.warning(
            `Command "${commandName}" completed with exit code ${result.result.exitCode}`,
          );
        }
      } else {
        toast.error(response.message ?? "Failed to execute command");
      }
    } catch (error) {
      console.error("Command execution error:", error);
      toast.error("Failed to execute command");
    } finally {
      setExecuting(null);
    }
  };

  const enabledCommands = commands.filter((cmd) => cmd.enabled);

  if (enabledCommands.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Command Execution</CardTitle>
          <CardDescription>
            No enabled commands available. Configure commands in settings to get
            started.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-lg font-semibold">Execute Commands</h3>
        <p className="text-muted-foreground text-sm">
          Run configured commands on your system
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {enabledCommands.map((command) => (
          <Card key={command.name}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{command.name}</CardTitle>
              <CardDescription className="text-sm">
                {command.description ?? "No description available"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-muted-foreground bg-muted rounded p-2 font-mono text-xs">
                {command.command} {(command.args ?? []).join(" ")}
              </div>

              <Button
                onClick={() => executeCommand(command.name)}
                disabled={executing === command.name}
                className="w-full"
                size="sm"
              >
                {executing === command.name ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Execute
                  </>
                )}
              </Button>

              {results[command.name]?.result && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold">
                    Last Result (Exit Code:{" "}
                    {results[command.name]?.result?.exitCode ?? "N/A"})
                  </div>

                  {results[command.name]?.result?.stdout && (
                    <div className="text-xs">
                      <div className="font-medium text-green-600">stdout:</div>
                      <pre className="bg-muted max-h-20 overflow-y-auto rounded p-2 text-xs whitespace-pre-wrap">
                        {results[command.name]?.result?.stdout}
                      </pre>
                    </div>
                  )}

                  {results[command.name]?.result?.stderr && (
                    <div className="text-xs">
                      <div className="font-medium text-red-600">stderr:</div>
                      <pre className="bg-muted max-h-20 overflow-y-auto rounded p-2 text-xs whitespace-pre-wrap">
                        {results[command.name]?.result?.stderr}
                      </pre>
                    </div>
                  )}

                  {results[command.name]?.result?.error && (
                    <div className="text-xs">
                      <div className="font-medium text-red-600">error:</div>
                      <div className="bg-muted rounded p-2 text-xs">
                        {results[command.name]?.result?.error}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
