import { createContext } from "@lit/context";

import type { Settings } from "~/lib/system-bridge/types-settings";

export interface CommandExecutionResult {
  commandID: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  error?: string;
}

export interface CommandExecutionState {
  isExecuting: boolean;
  result: CommandExecutionResult | null;
}

export interface SettingsUpdateError {
  requestId: string;
  message: string;
  timestamp: number;
}

export interface BridgeSettingsState {
  settings: Settings | null;
  settingsUpdateError: SettingsUpdateError | null;
  commandExecutions: Map<string, CommandExecutionState>;
}

export const bridgeSettingsContext =
  createContext<BridgeSettingsState>("bridge-settings");
