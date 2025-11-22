import { consume } from "@lit/context";
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";

import {
  connectionContext,
  type ConnectionSettings,
} from "~/contexts/connection";
import { websocketContext, type WebSocketState } from "~/contexts/websocket";
import { showError, showSuccess } from "~/lib/notifications";
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

  connectedCallback() {
    super.connectedCallback();
    this.loadSettings();
  }

  updated(changedProperties: Map<PropertyKey, unknown>) {
    if (changedProperties.has("websocket")) {
      this.loadSettings();
    }
  }

  private loadSettings() {
    if (this.websocket?.settings) {
      this.commands = [...this.websocket.settings.commands.allowlist];
    }
  }

  private handleNavigateToHome = (): void => {
    this.navigate("/");
  };

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
      showError("Please enter both name and command");
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

    this.commands = [...this.commands, newCommand];
    this.saveSettings();
    this.newCommandName = "";
    this.newCommandCommand = "";
    this.newCommandWorkingDir = "";
    this.newCommandArguments = "";
    showSuccess("Command added successfully");
  };

  private handleRemoveCommand = (e: Event): void => {
    const button = e.currentTarget as HTMLElement;
    const id = button.getAttribute("data-id");
    if (!id) return;

    this.commands = this.commands.filter((cmd) => cmd.id !== id);
    this.saveSettings();
    showSuccess("Command removed successfully");
  };

  private saveSettings(): void {
    if (!this.connection?.token) {
      showError("No token found");
      return;
    }

    if (!this.websocket?.sendRequest || !this.websocket?.settings) {
      showError("WebSocket not available");
      return;
    }

    this.isSubmitting = true;
    this.requestUpdate();

    try {
      const updatedSettings: Settings = {
        ...this.websocket.settings,
        commands: {
          allowlist: this.commands,
        },
      };

      this.websocket.sendRequest({
        id: generateUUID(),
        event: "UPDATE_SETTINGS",
        data: updatedSettings,
        token: this.connection.token,
      });
    } catch (error) {
      console.error("Failed to update command settings:", error);
      showError("Failed to update settings");
    } finally {
      this.isSubmitting = false;
      this.requestUpdate();
    }
  }

  private renderCommandItem(cmd: SettingsCommandDefinition) {
    return html`
      <div class="flex items-center gap-4 p-3 rounded-md border">
        <div class="flex-1 space-y-1">
          <div class="font-medium">${cmd.name}</div>
          <div class="text-sm text-muted-foreground break-all">
            ${cmd.command}
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
        <ui-button
          variant="destructive"
          size="sm"
          data-id=${cmd.id}
          @click=${this.handleRemoveCommand}
          ?disabled=${this.isSubmitting}
        >
          <ui-icon name="Trash2"></ui-icon>
        </ui-button>
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
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <ui-button
                variant="ghost"
                size="icon"
                @click=${this.handleNavigateToHome}
                aria-label="Back to home"
              >
                <ui-icon name="ArrowLeft"></ui-icon>
              </ui-button>
              <div>
                <h1 class="text-3xl font-bold mb-2">Commands</h1>
                <p class="text-muted-foreground">
                  Manage commands that can be executed remotely
                </p>
              </div>
            </div>
            <ui-connection-indicator></ui-connection-indicator>
          </div>

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
