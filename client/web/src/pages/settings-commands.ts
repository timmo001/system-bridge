import type {
  CommandResult,
  Settings,
  SettingsCommandDefinition,
} from "@timmo001/effect-system-bridge";
import { Option, Struct } from "effect";
import { AsyncResult } from "effect/reactivity";
import { html, type TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";

import { AtomController } from "~/controllers/atom-controller";
import {
  type BridgeError,
  commandExecutions,
  errorMessage,
  executeCommand,
  registry,
} from "~/lib/atoms";
import { getResultStyle } from "~/lib/result-styles";
import { generateUUID } from "~/lib/utils";
import { SettingsPageElement } from "~/mixins/settings-page";
import "../components/ui/button";
import "../components/ui/connection-indicator";
import "../components/ui/connection-required";
import "../components/ui/icon";
import "../components/ui/input";
import "../components/ui/label";

type CommandOutcome = Omit<CommandResult, "commandID">;

@customElement("page-settings-commands")
class PageSettingsCommands extends SettingsPageElement {
  title = "Commands";
  description = "Manage commands that can be executed remotely";

  readonly #executions = new AtomController(this, () =>
    commandExecutions(this.commands.map((cmd) => cmd.id).join("\n")),
  );

  @state()
  private commands: readonly SettingsCommandDefinition[] = [];

  @state()
  private newCommandName = "";

  @state()
  private newCommandCommand = "";

  @state()
  private newCommandWorkingDir = "";

  @state()
  private newCommandArguments = "";

  /** The ID of a command being added, so the form clears once it's saved. */
  private addingCommandID: string | null = null;

  private get isSubmitting(): boolean {
    return this.isSaving;
  }

  private get errorMessage(): string | null {
    const error = this.saveError;

    return error === null ? null : this.extractErrorMessage(error);
  }

  private extractErrorMessage(fullMessage: string): string {
    // Extract the meaningful part of the error message
    const patterns = [
      /command\s+[a-f0-9-]+\s+(.+)$/i,
      /validation\s+failed:\s*(.+)$/i,
      /failed\s+to\s+[^:]+:\s*(.+)$/i,
      /:\s*([^:]+)$/,
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(fullMessage);

      if (match?.[1]) {
        const extracted = match[1].trim();

        return extracted.charAt(0).toUpperCase() + extracted.slice(1);
      }
    }

    return fullMessage;
  }

  protected settingsLoaded(settings: Settings): void {
    this.commands = settings.commands.allowlist;

    if (
      this.addingCommandID !== null &&
      this.commands.some((cmd) => cmd.id === this.addingCommandID)
    ) {
      this.addingCommandID = null;
      this.clearCommandForm();
    }
  }

  private handleNavigateToConnection = (): void => {
    this.navigate("/connection");
  };

  private handleNameInput = (e: Event & { target: HTMLInputElement }): void => {
    this.newCommandName = e.target.value;
  };

  private handleCommandInput = (
    e: Event & { target: HTMLInputElement },
  ): void => {
    this.newCommandCommand = e.target.value;
  };

  private handleWorkingDirInput = (
    e: Event & { target: HTMLInputElement },
  ): void => {
    this.newCommandWorkingDir = e.target.value;
  };

  private handleArgumentsInput = (
    e: Event & { target: HTMLInputElement },
  ): void => {
    this.newCommandArguments = e.target.value;
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

    this.addingCommandID = newCommand.id;
    this.saveCommands([...this.commands, newCommand]);
  };

  private handleRemoveCommand = (
    e: Event & { currentTarget: HTMLElement },
  ): void => {
    const id = e.currentTarget.getAttribute("data-id");

    if (!id) return;

    this.saveCommands(this.commands.filter((cmd) => cmd.id !== id));
  };

  private handleExecuteCommand = (
    e: Event & { currentTarget: HTMLElement },
  ): void => {
    const id = e.currentTarget.getAttribute("data-id");

    if (!id || !this.commands.some((cmd) => cmd.id === id)) return;

    registry.set(executeCommand(id), undefined);
  };

  private handleCopyId = async (
    e: Event & { currentTarget: HTMLElement },
  ): Promise<void> => {
    const id = e.currentTarget.getAttribute("data-id");

    if (!id) return;

    try {
      await navigator.clipboard.writeText(id);
    } catch (error) {
      console.error("Failed to copy ID to clipboard:", error);
    }
  };

  private saveCommands(commands: readonly SettingsCommandDefinition[]): void {
    const current = this.settings;

    if (!current) return;

    this.saveSettings(
      Struct.assign(current, { commands: { allowlist: commands } }),
    );
  }

  private clearCommandForm(): void {
    this.newCommandName = "";
    this.newCommandCommand = "";
    this.newCommandWorkingDir = "";
    this.newCommandArguments = "";
  }

  /** A finished execution, with failures shown like a failed command. */
  private outcome(
    execution: AsyncResult.AsyncResult<CommandResult, BridgeError>,
  ): CommandOutcome | undefined {
    if (AsyncResult.isSuccess(execution)) return execution.value;

    if (!AsyncResult.isFailure(execution)) return undefined;

    return {
      exitCode: 1,
      stdout: "",
      stderr: "",
      error: Option.match(AsyncResult.error(execution), {
        onNone: () => "Command execution failed",
        onSome: errorMessage,
      }),
    };
  }

  private renderCommandMeta(cmd: SettingsCommandDefinition): TemplateResult {
    return html`
      ${
        cmd.workingDir
          ? html`
              <div class="text-xs text-muted-foreground">
                Working Dir: ${cmd.workingDir}
              </div>
            `
          : ""
      }
      ${
        cmd.arguments.length > 0
          ? html`
              <div class="text-xs text-muted-foreground">
                Arguments: ${cmd.arguments.join(", ")}
              </div>
            `
          : ""
      }
    `;
  }

  private renderCommandActions(
    cmd: SettingsCommandDefinition,
    isExecuting: boolean,
  ): TemplateResult {
    return html`
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
    `;
  }

  private renderCommandResultBlock(
    result: CommandOutcome | undefined,
  ): TemplateResult {
    if (!result) return html``;

    const style = getResultStyle(result.exitCode === 0);

    return html`
      <div
        class="p-3 rounded-md border ${style.bgClass} ${style.borderClass} space-y-2"
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
        ${
          result.stdout
            ? html`
                <div class="space-y-1">
                  <div class="text-xs font-medium text-muted-foreground">
                    Output:
                  </div>
                  <pre
                    class="text-xs bg-black/30 p-2 rounded overflow-x-auto max-h-32"
                  >
${result.stdout}</pre>
                </div>
              `
            : ""
        }
        ${
          result.stderr
            ? html`
                <div class="space-y-1">
                  <div class="text-xs font-medium text-red-400">
                    Error Output:
                  </div>
                  <pre
                    class="text-xs bg-black/30 p-2 rounded overflow-x-auto max-h-32"
                  >
${result.stderr}</pre>
                </div>
              `
            : ""
        }
      </div>
    `;
  }

  private renderCommandItem(cmd: SettingsCommandDefinition) {
    const execution = this.#executions.value.get(cmd.id);
    const isExecuting = execution?.waiting ?? false;

    const result =
      execution && !isExecuting ? this.outcome(execution) : undefined;

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
            ${this.renderCommandMeta(cmd)}
          </div>
          ${this.renderCommandActions(cmd, isExecuting)}
        </div>
        ${this.renderCommandResultBlock(result)}
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

  private renderErrorMessage(): TemplateResult {
    if (!this.errorMessage) return html``;

    return html`
      <div
        class="rounded-lg border border-red-800 bg-red-950/30 p-4 flex items-start gap-3"
      >
        <ui-icon name="AlertCircle" class="text-red-400"></ui-icon>
        <div class="flex-1">
          <div class="font-medium text-red-200">Failed to save command</div>
          <div class="text-sm text-red-300 mt-1">${this.errorMessage}</div>
        </div>
      </div>
    `;
  }

  private renderAddCommandForm(): TemplateResult {
    return html`
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
            <ui-label>Arguments (optional, comma-separated)</ui-label>
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
              ?disabled=${
                this.isSubmitting ||
                !this.newCommandName.trim() ||
                !this.newCommandCommand.trim()
              }
            >
              ${
                this.isSubmitting
                  ? html`<ui-icon
                      name="Loader2"
                      className="animate-spin"
                    ></ui-icon>`
                  : ""
              }
              Add Command
            </ui-button>
          </div>
        </div>
      </div>
    `;
  }

  private renderCommandListSection(): TemplateResult {
    return html`
      <div class="rounded-lg border bg-card p-6 space-y-4">
        <h2 class="text-xl font-semibold">
          Commands
          ${this.commands.length > 0 ? `(${this.commands.length})` : ""}
        </h2>
        ${this.renderCommandList()}
      </div>
    `;
  }

  render() {
    const isConnected = this.status?.isConnected ?? false;

    return html`
      <div class="min-h-screen bg-background text-foreground p-8">
        <div class="max-w-4xl mx-auto space-y-6">
          ${this.renderPageHeader()} ${this.renderErrorMessage()}
          ${this.renderWithConnection(
            isConnected,
            "Please connect to System Bridge to manage commands.",
            this.handleNavigateToConnection,
            html`
              <div class="space-y-6">
                ${this.renderAddCommandForm()}
                ${this.renderCommandListSection()}
              </div>
            `,
          )}
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
