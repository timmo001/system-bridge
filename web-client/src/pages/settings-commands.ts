import { consume } from "@lit/context";
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";

import {
  connectionContext,
  type ConnectionSettings,
} from "~/contexts/connection";
import { websocketContext, type WebSocketState } from "~/contexts/websocket";
import type {
  Settings,
  SettingsCommandDefinition,
} from "~/lib/system-bridge/types-settings";
import { generateUUID } from "~/lib/utils";
import { PageElement } from "~/mixins";
import "../components/ui/button";
import "../components/ui/connection-indicator";
import "../components/ui/connection-required";
import "../components/ui/icon";
import "../components/ui/input";
import "../components/ui/label";

@customElement("page-settings-commands")
export class PageSettingsCommands extends PageElement {
  title = "Commands";
  description = "Manage commands that can be executed remotely";

  @consume({ context: websocketContext, subscribe: true })
  websocket?: WebSocketState;

  @consume({ context: connectionContext, subscribe: true })
  connection?: ConnectionSettings;

  @state()
  private commands: SettingsCommandDefinition[] = [];

  @state()
  private newCommandName = "";

  @state()
  private newCommandCommand = "";

  @state()
  private newCommandWorkingDir = "";

  @state()
  private newCommandArguments = "";

  @state()
  private isSubmitting = false;

  @state()
  private pendingRequestId: string | null = null;

  @state()
  private errorMessage: string | null = null;

  private submissionTimeout: number | null = null;
  private previousCommands: SettingsCommandDefinition[] = [];
  private errorTimeout: number | null = null;
  private pendingCommandAction: "add" | "remove" | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.loadSettings();
    this.previousCommands = [...this.commands];

    // Listen for settings update events on window scope
    // The websocket-provider dispatches these events with bubbling enabled,
    // and we use window to reliably catch them regardless of DOM structure.
    // This bypasses Lit's context system for more immediate event delivery.
    window.addEventListener(
      "settings-update-error",
      this.handleSettingsUpdateError,
    );
    window.addEventListener("settings-updated", this.handleSettingsUpdated);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.submissionTimeout !== null) {
      clearTimeout(this.submissionTimeout);
      this.submissionTimeout = null;
    }
    if (this.errorTimeout !== null) {
      clearTimeout(this.errorTimeout);
      this.errorTimeout = null;
    }
    // Remove event listeners from window
    window.removeEventListener(
      "settings-update-error",
      this.handleSettingsUpdateError,
    );
    window.removeEventListener("settings-updated", this.handleSettingsUpdated);
  }

  private extractErrorMessage(fullMessage: string): string {
    // Extract the meaningful part of the error message
    // Example: "settings validation failed: command at index 0: command c60de62f-9e8f-4d8d-af71-9bd03b64cbf3 must use absolute path"
    // Should return: "Command must use absolute path"

    // Try multiple patterns in order of specificity
    const patterns = [
      // Pattern for command UUID errors: "command [uuid] error text"
      /command\s+[a-f0-9-]+\s+(.+)$/i,
      // Pattern for validation errors: "validation failed: actual error"
      /validation\s+failed:\s*(.+)$/i,
      // Pattern for generic "failed to" errors
      /failed\s+to\s+[^:]+:\s*(.+)$/i,
      // Pattern for errors after colon
      /:\s*([^:]+)$/,
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(fullMessage);
      if (match?.[1]) {
        const extracted = match[1].trim();
        // Capitalize first letter and return
        return extracted.charAt(0).toUpperCase() + extracted.slice(1);
      }
    }

    // Fallback: return the original message
    return fullMessage;
  }

  private handleSettingsUpdateError = (event: Event): void => {
    const customEvent = event as CustomEvent<{
      requestId: string;
      message: string;
      timestamp: number;
    }>;

    // Check if this error is for our pending request
    if (
      this.isSubmitting &&
      this.pendingRequestId === customEvent.detail.requestId
    ) {
      // Reload commands from actual settings (which won't include the invalid command)
      this.loadSettings();

      // Show error message with cleaned up text
      this.errorMessage = this.extractErrorMessage(customEvent.detail.message);

      // Clear error after 10 seconds
      if (this.errorTimeout !== null) {
        clearTimeout(this.errorTimeout);
      }
      this.errorTimeout = window.setTimeout(() => {
        this.errorMessage = null;
        this.errorTimeout = null;
        this.requestUpdate();
      }, 10000);

      // Clear submission state
      this.clearSubmissionState();
    }
  };

  private handleSettingsUpdated = (event: Event): void => {
    const customEvent = event as CustomEvent<{
      requestId: string;
      timestamp: number;
    }>;

    // Check if this update is for our pending request
    if (
      this.isSubmitting &&
      this.pendingRequestId === customEvent.detail.requestId
    ) {
      // Load updated settings from websocket context
      this.loadSettings();

      this.handleSuccessfulSave();
    }
  };

  updated(changedProperties: Map<PropertyKey, unknown>) {
    if (changedProperties.has("websocket")) {
      this.loadSettings();

      // Check if settings have been updated successfully after a pending submission
      if (this.isSubmitting && this.pendingRequestId !== null) {
        const currentCommands =
          this.websocket?.settings?.commands.allowlist ?? [];
        const previousCommandsStr = JSON.stringify(this.previousCommands);
        const currentCommandsStr = JSON.stringify(currentCommands);

        // If commands have changed, clear the submitting state
        if (previousCommandsStr !== currentCommandsStr) {
          this.handleSuccessfulSave();
        }
      }
    }
  }

  private loadSettings() {
    if (this.websocket?.settings) {
      this.commands = [...this.websocket.settings.commands.allowlist];
      // Don't update previousCommands here - it should only be updated when initiating a submission
      // This allows the updated() method to detect when settings have changed successfully
    }
  }

  private clearSubmissionState(): void {
    this.isSubmitting = false;
    this.pendingRequestId = null;
    this.pendingCommandAction = null;
    if (this.submissionTimeout !== null) {
      clearTimeout(this.submissionTimeout);
      this.submissionTimeout = null;
    }
    // Update previousCommands to current state after submission completes
    this.previousCommands = [...this.commands];
    this.requestUpdate();
  }

  private handleNavigateToConnection = (): void => {
    this.navigate("/connection");
  };

  private handleNameInput = (e: InputEvent): void => {
    const input = e.target as HTMLInputElement;
    this.newCommandName = input.value;
  };

  private handleCommandInput = (e: InputEvent): void => {
    const input = e.target as HTMLInputElement;
    this.newCommandCommand = input.value;
  };

  private handleWorkingDirInput = (e: InputEvent): void => {
    const input = e.target as HTMLInputElement;
    this.newCommandWorkingDir = input.value;
  };

  private handleArgumentsInput = (e: InputEvent): void => {
    const input = e.target as HTMLInputElement;
    this.newCommandArguments = input.value;
  };

  private handleAddCommand = (): void => {
    if (!this.newCommandName.trim() || !this.newCommandCommand.trim()) {
      return;
    }

    const args = this.newCommandArguments
      .trim()
      .split(",")
      .map((arg) => arg.trim())
      .filter((arg) => arg.length > 0);

    const newCommand: SettingsCommandDefinition = {
      id: generateUUID(),
      name: this.newCommandName.trim(),
      command: this.newCommandCommand.trim(),
      workingDir: this.newCommandWorkingDir.trim(),
      arguments: args,
    };

    // Don't optimistically add - wait for backend confirmation
    // Just save with the new command included
    const updatedCommands = [...this.commands, newCommand];
    this.pendingCommandAction = "add";
    this.saveSettingsWithCommands(updatedCommands);
  };

  private handleRemoveCommand = (e: Event): void => {
    const button = e.currentTarget as HTMLElement;
    const id = button.getAttribute("data-id");
    if (!id) return;

    // Don't optimistically remove - wait for backend confirmation
    const updatedCommands = this.commands.filter((cmd) => cmd.id !== id);
    this.pendingCommandAction = "remove";
    this.saveSettingsWithCommands(updatedCommands);
  };

  private handleExecuteCommand = (e: Event): void => {
    const button = e.currentTarget as HTMLElement;
    const id = button.getAttribute("data-id");
    if (!id) return;

    if (!this.connection?.token || !this.websocket?.sendCommandExecute) {
      return;
    }

    const command = this.commands.find((cmd) => cmd.id === id);
    if (!command) {
      return;
    }

    this.websocket.sendCommandExecute(
      generateUUID(),
      id,
      this.connection.token,
    );
  };

  private handleCopyId = async (e: Event): Promise<void> => {
    const button = e.currentTarget as HTMLElement;
    const id = button.getAttribute("data-id");
    if (!id) return;

    try {
      await navigator.clipboard.writeText(id);
    } catch (error) {
      console.error("Failed to copy ID to clipboard:", error);
    }
  };

  private saveSettingsWithCommands(
    commands: SettingsCommandDefinition[],
  ): void {
    if (!this.connection?.token) {
      return;
    }

    if (!this.websocket?.sendRequest || !this.websocket?.settings) {
      return;
    }

    // Clear any existing timeout
    if (this.submissionTimeout !== null) {
      clearTimeout(this.submissionTimeout);
      this.submissionTimeout = null;
    }

    this.isSubmitting = true;
    const requestId = generateUUID();
    this.pendingRequestId = requestId;
    this.previousCommands = [...this.commands];
    this.requestUpdate();

    try {
      const updatedSettings: Settings = {
        ...this.websocket.settings,
        commands: {
          allowlist: commands,
        },
      };

      this.websocket.sendRequest({
        id: requestId,
        event: "UPDATE_SETTINGS",
        data: updatedSettings,
        token: this.connection.token,
      });

      // Set timeout to clear submitting state if no response received
      // Using 30s timeout (increased from 10s) to accommodate slower systems
      // and prevent premature timeout on settings validation/persistence
      this.submissionTimeout = window.setTimeout(() => {
        if (this.isSubmitting && this.pendingRequestId === requestId) {
          console.warn(
            "Settings update timeout: no response received after 30 seconds",
          );
          this.clearSubmissionState();
        }
      }, 30000);
    } catch (error) {
      console.error("Failed to update command settings:", error);
      this.clearSubmissionState();
    }
  }

  private clearCommandForm(): void {
    this.newCommandName = "";
    this.newCommandCommand = "";
    this.newCommandWorkingDir = "";
    this.newCommandArguments = "";
  }

  private handleSuccessfulSave(): void {
    if (this.pendingCommandAction === "add") {
      this.clearCommandForm();
    }
    this.clearSubmissionState();
  }

  private renderCommandItem(cmd: SettingsCommandDefinition) {
    const executionState = this.websocket?.commandExecutions.get(cmd.id);
    const isExecuting = executionState?.isExecuting ?? false;
    const result = executionState?.result as
      | {
          exitCode: number;
          stdout: string;
          stderr: string;
          error?: string;
        }
      | null
      | undefined;

    return html`
      <div class="flex flex-col gap-3 p-4 rounded-md border">
        <div class="flex items-center gap-4">
          <div class="flex-1 space-y-1">
            <div class="font-medium">${cmd.name}</div>
            <div class="text-sm text-muted-foreground break-all">
              ${cmd.command}
            </div>
            <div class="flex items-center gap-2 text-xs text-muted-foreground">
              <span><span class="select-none">ID: </span>${cmd.id}</span>
              <ui-button
                variant="ghost"
                size="icon"
                data-id=${cmd.id}
                @click=${this.handleCopyId}
                title="Copy ID"
                class="h-5 w-5"
              >
                <ui-icon name="Copy" size="12"></ui-icon>
              </ui-button>
            </div>
            ${cmd.workingDir
              ? html`
                  <div class="text-xs text-muted-foreground">
                    Working Dir: ${cmd.workingDir}
                  </div>
                `
              : ""}
            ${cmd.arguments.length > 0
              ? html`
                  <div class="text-xs text-muted-foreground">
                    Arguments: ${cmd.arguments.join(", ")}
                  </div>
                `
              : ""}
          </div>
          <div class="flex gap-2">
            <ui-button
              variant="default"
              size="sm"
              data-id=${cmd.id}
              @click=${this.handleExecuteCommand}
              ?disabled=${isExecuting || this.isSubmitting}
              title="Execute command"
            >
              <ui-icon
                name=${isExecuting ? "Loader2" : "Play"}
                className=${isExecuting ? "animate-spin" : ""}
              ></ui-icon>
            </ui-button>
            <ui-button
              variant="destructive"
              size="sm"
              data-id=${cmd.id}
              @click=${this.handleRemoveCommand}
              ?disabled=${this.isSubmitting}
              title="Remove command"
            >
              <ui-icon
                name=${this.isSubmitting ? "Loader2" : "Trash2"}
                className=${this.isSubmitting ? "animate-spin" : ""}
              ></ui-icon>
            </ui-button>
          </div>
        </div>
        ${result
          ? html`
              <div
                class="p-3 rounded-md border ${result.exitCode === 0
                  ? "bg-green-950/30 border-green-800"
                  : "bg-red-950/30 border-red-800"} space-y-2"
              >
                <div class="flex items-center gap-2 text-sm font-medium">
                  <ui-icon
                    name=${result.exitCode === 0 ? "CheckCircle2" : "XCircle"}
                  ></ui-icon>
                  <span
                    >Exit Code: ${result.exitCode}
                    ${result.error ? `(${result.error})` : ""}</span
                  >
                </div>
                ${result.stdout
                  ? html`
                      <div class="space-y-1">
                        <div class="text-xs font-medium text-muted-foreground">
                          Output:
                        </div>
                        <pre
                          class="text-xs bg-black/30 p-2 rounded overflow-x-auto max-h-32"
                        >
${result.stdout}</pre
                        >
                      </div>
                    `
                  : ""}
                ${result.stderr
                  ? html`
                      <div class="space-y-1">
                        <div class="text-xs font-medium text-red-400">
                          Error Output:
                        </div>
                        <pre
                          class="text-xs bg-black/30 p-2 rounded overflow-x-auto max-h-32"
                        >
${result.stderr}</pre
                        >
                      </div>
                    `
                  : ""}
              </div>
            `
          : ""}
      </div>
    `;
  }

  private renderCommandList() {
    if (this.commands.length === 0) {
      return html`
        <div
          class="text-sm text-muted-foreground italic p-4 text-center border rounded-md"
        >
          No commands configured
        </div>
      `;
    }

    const commandItems = this.commands.map((cmd) =>
      this.renderCommandItem(cmd),
    );

    return html` <div class="space-y-2">${commandItems}</div> `;
  }

  render() {
    const isConnected = this.websocket?.isConnected ?? false;

    return html`
      <div class="min-h-screen bg-background text-foreground p-8">
        <div class="max-w-4xl mx-auto space-y-6">
          ${this.renderPageHeader()}
          ${this.errorMessage
            ? html`
                <div
                  class="rounded-lg border border-red-800 bg-red-950/30 p-4 flex items-start gap-3"
                >
                  <ui-icon name="AlertCircle" class="text-red-400"></ui-icon>
                  <div class="flex-1">
                    <div class="font-medium text-red-200">
                      Failed to save command
                    </div>
                    <div class="text-sm text-red-300 mt-1">
                      ${this.errorMessage}
                    </div>
                  </div>
                </div>
              `
            : ""}
          ${!isConnected
            ? html`
                <ui-connection-required
                  message="Please connect to System Bridge to manage commands."
                  @configure-connection=${this.handleNavigateToConnection}
                ></ui-connection-required>
              `
            : html`
                <div class="space-y-6">
                  <div class="rounded-lg border bg-card p-6 space-y-4">
                    <h2 class="text-xl font-semibold">Add Command</h2>
                    <p class="text-sm text-muted-foreground">
                      Add commands that can be executed remotely via the API.
                    </p>

                    <div class="space-y-3">
                      <div>
                        <ui-label>Name</ui-label>
                        <ui-input
                          placeholder="Enter command name"
                          .value=${this.newCommandName}
                          @input=${this.handleNameInput}
                          ?disabled=${this.isSubmitting}
                        ></ui-input>
                      </div>
                      <div>
                        <ui-label>Command</ui-label>
                        <ui-input
                          placeholder="Enter command to execute"
                          .value=${this.newCommandCommand}
                          @input=${this.handleCommandInput}
                          ?disabled=${this.isSubmitting}
                        ></ui-input>
                      </div>
                      <div>
                        <ui-label>Working Directory (optional)</ui-label>
                        <ui-input
                          placeholder="Enter working directory"
                          .value=${this.newCommandWorkingDir}
                          @input=${this.handleWorkingDirInput}
                          ?disabled=${this.isSubmitting}
                        ></ui-input>
                      </div>
                      <div>
                        <ui-label
                          >Arguments (optional, comma-separated)</ui-label
                        >
                        <ui-input
                          placeholder="arg1, arg2, arg3"
                          .value=${this.newCommandArguments}
                          @input=${this.handleArgumentsInput}
                          ?disabled=${this.isSubmitting}
                        ></ui-input>
                      </div>
                      <div class="flex justify-end">
                        <ui-button
                          variant="secondary"
                          @click=${this.handleAddCommand}
                          ?disabled=${this.isSubmitting ||
                          !this.newCommandName.trim() ||
                          !this.newCommandCommand.trim()}
                        >
                          ${this.isSubmitting
                            ? html`<ui-icon
                                name="Loader2"
                                className="animate-spin"
                              ></ui-icon>`
                            : ""}
                          Add Command
                        </ui-button>
                      </div>
                    </div>
                  </div>

                  <div class="rounded-lg border bg-card p-6 space-y-4">
                    <h2 class="text-xl font-semibold">
                      Commands
                      ${this.commands.length > 0
                        ? `(${this.commands.length})`
                        : ""}
                    </h2>
                    ${this.renderCommandList()}
                  </div>
                </div>
              `}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-settings-commands": PageSettingsCommands;
  }
}
