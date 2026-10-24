import {
  mdiConsoleLine,
  mdiContentCopy,
  mdiPlay,
  mdiPlus,
  mdiTrashCanOutline,
} from "@mdi/js";
import type {
  CommandResult,
  Settings,
  SettingsCommandDefinition,
} from "@timmo001/effect-system-bridge";
import { Option, Struct } from "effect";
import { AsyncResult } from "effect/reactivity";
import { css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";

import "~/components/sb-card";
import { icon, pageStyles, shared, spinner } from "~/components/shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import {
  type BridgeError,
  commandExecutions,
  errorMessage,
  executeCommand,
  registry,
} from "~/lib/atoms";
import { generateUUID } from "~/lib/utils";

import { SbSettingsPage } from "./sb-settings-page";

type CommandOutcome = Omit<CommandResult, "commandID">;

interface CommandForm {
  readonly name: string;
  readonly command: string;
  readonly workingDir: string;
  readonly arguments: string;
}

const emptyForm: CommandForm = {
  name: "",
  command: "",
  workingDir: "",
  arguments: "",
};

const isFormKey = (name: string): name is keyof CommandForm =>
  name in emptyForm;

/** A finished run, with failures shown like a failed command. */
const outcome = (
  execution: AsyncResult.AsyncResult<CommandResult, BridgeError>,
): CommandOutcome | undefined => {
  if (AsyncResult.isSuccess(execution)) return execution.value;

  if (!AsyncResult.isFailure(execution)) return undefined;

  return {
    exitCode: 1,
    stdout: "",
    stderr: "",
    error: Option.match(AsyncResult.error(execution), {
      onNone: () => "The command couldn't run",
      onSome: errorMessage,
    }),
  };
};

/** Commands that clients such as Home Assistant may run on this system. */
@customElement("page-settings-commands")
export class PageSettingsCommands extends SbSettingsPage {
  static override styles = [
    shared,
    pageStyles,
    css`
      .command {
        display: flex;
        flex-direction: column;
        gap: var(--sb-space-3);
        padding: var(--sb-space-4);
        background: var(--sb-color-sunken);
        border-radius: var(--sb-radius-l);
      }

      .command code {
        font-size: var(--sb-font-size-s);
        overflow-wrap: anywhere;
      }

      pre {
        margin: 0;
        max-height: 12rem;
        padding: var(--sb-space-3);
        overflow: auto;
        font-size: var(--sb-font-size-xs);
        background: var(--sb-color-surface);
        border: 1px solid var(--sb-color-border);
        border-radius: var(--sb-radius-m);
      }
    `,
  ];

  readonly #executions = new AtomController(this, () =>
    commandExecutions(this.commands.map((command) => command.id).join("\n")),
  );

  @state() private commands: readonly SettingsCommandDefinition[] = [];

  @state() private form: CommandForm = emptyForm;

  /** The ID of a command being added, so the form clears once it's saved. */
  #adding: string | null = null;

  protected readonly pageTitle = "Commands";

  protected settingsLoaded(settings: Settings): void {
    this.commands = settings.commands.allowlist;

    if (
      this.#adding !== null &&
      this.commands.some((command) => command.id === this.#adding)
    ) {
      this.#adding = null;
      this.form = emptyForm;
    }
  }

  #save(commands: readonly SettingsCommandDefinition[]) {
    const current = this.settings;

    if (current !== undefined) {
      this.saveSettings(
        Struct.assign(current, { commands: { allowlist: commands } }),
      );
    }
  }

  /** The command an action button is for, from its `data-id`. */
  #commandId(event: MouseEvent): string | undefined {
    return event.currentTarget instanceof HTMLButtonElement
      ? event.currentTarget.dataset.id
      : undefined;
  }

  #onCopyId = (event: MouseEvent) => {
    const id = this.#commandId(event);

    if (id !== undefined) void navigator.clipboard.writeText(id);
  };

  #onRun = (event: MouseEvent) => {
    const id = this.#commandId(event);

    if (id !== undefined) registry.set(executeCommand(id), undefined);
  };

  #onRemove = (event: MouseEvent) => {
    const id = this.#commandId(event);

    if (id !== undefined) {
      this.#save(this.commands.filter((command) => command.id !== id));
    }
  };

  /** Fields are named after their key in the form. */
  #onInput = (event: InputEvent) => {
    const target = event.target;

    if (target instanceof HTMLInputElement && isFormKey(target.name)) {
      this.form = { ...this.form, [target.name]: target.value };
    }
  };

  #onSubmit = (event: SubmitEvent) => {
    event.preventDefault();

    const { name, command, workingDir } = this.form;

    if (name.trim() === "" || command.trim() === "") return;

    const definition: SettingsCommandDefinition = {
      id: generateUUID(),
      name: name.trim(),
      command: command.trim(),
      workingDir: workingDir.trim(),
      arguments: this.form.arguments
        .split(",")
        .map((argument) => argument.trim())
        .filter((argument) => argument !== ""),
    };

    this.#adding = definition.id;
    this.#save([...this.commands, definition]);
  };

  #input(
    key: keyof CommandForm,
    label: string,
    placeholder: string,
    hint?: string,
  ) {
    return html`
      <div class="field">
        <label for=${key}>${label}</label>
        <input
          class="input ${key === "command" ? "mono" : ""}"
          id=${key}
          name=${key}
          placeholder=${placeholder}
          ?required=${key === "name" || key === "command"}
          ?disabled=${this.isSaving}
          .value=${this.form[key]}
          @input=${this.#onInput}
        />
        ${hint === undefined ? nothing : html`<span class="hint">${hint}</span>`}
      </div>
    `;
  }

  #renderOutcome(result: CommandOutcome | undefined) {
    if (result === undefined) return nothing;

    const ok = result.exitCode === 0;

    return html`
      <div class="stack" style="--sb-stack-gap: var(--sb-space-2)">
        <span
          class="chip ${ok ? "success" : "danger"}"
          style="align-self: start"
        >
          Exit code
          ${result.exitCode}${result.error ? ` · ${result.error}` : ""}
        </span>
        ${result.stdout ? html`<pre>${result.stdout}</pre>` : nothing}
        ${
          result.stderr
            ? html`<pre style="color: var(--sb-color-danger)">
${result.stderr}</pre>`
            : nothing
        }
      </div>
    `;
  }

  #renderCommand(command: SettingsCommandDefinition) {
    const execution = this.#executions.value.get(command.id);
    const running = execution?.waiting ?? false;

    return html`
      <div class="command">
        <div class="row wrap" style="align-items: flex-start">
          <div
            class="stack"
            style="flex: 1; min-width: 12rem; --sb-stack-gap: var(--sb-space-1)"
          >
            <strong>${command.name}</strong>
            <code>${[command.command, ...command.arguments].join(" ")}</code>
            ${
              command.workingDir
                ? html`<span class="muted xsmall"
                    >In ${command.workingDir}</span
                  >`
                : nothing
            }
            <span class="row muted xsmall">
              <span class="mono">${command.id}</span>
              <button
                class="button plain icon-only small"
                type="button"
                aria-label="Copy the ID of ${command.name}"
                title="Copy ID"
                data-id=${command.id}
                @click=${this.#onCopyId}
              >
                ${icon(mdiContentCopy)}
              </button>
            </span>
          </div>
          <div class="row">
            <button
              class="button tonal small"
              type="button"
              aria-label="Run ${command.name}"
              ?disabled=${running || this.isSaving}
              data-id=${command.id}
              @click=${this.#onRun}
            >
              ${running ? spinner() : icon(mdiPlay)} Run
            </button>
            <button
              class="button danger small icon-only"
              type="button"
              aria-label="Remove ${command.name}"
              title="Remove"
              ?disabled=${this.isSaving}
              data-id=${command.id}
              @click=${this.#onRemove}
            >
              ${icon(mdiTrashCanOutline)}
            </button>
          </div>
        </div>
        ${this.#renderOutcome(
          execution === undefined || running ? undefined : outcome(execution),
        )}
      </div>
    `;
  }

  #renderContent() {
    const saving = this.isSaving;

    return html`
      <sb-card heading="Add a command">
        <form class="stack" @submit=${this.#onSubmit}>
          <div class="grid" style="--sb-grid-min: 16rem">
            ${this.#input("name", "Name", "Restart audio")}
            ${this.#input(
              "command",
              "Command",
              "/usr/bin/systemctl",
              "The program's full path.",
            )}
            ${this.#input(
              "arguments",
              "Arguments",
              "--user, restart, pipewire",
              "Separated by commas.",
            )}
            ${this.#input("workingDir", "Working directory", "/home/me", "Optional.")}
          </div>
          <div class="row" style="justify-content: flex-end">
            <button
              class="button filled"
              type="submit"
              ?disabled=${
                saving ||
                this.form.name.trim() === "" ||
                this.form.command.trim() === ""
              }
            >
              ${saving ? spinner() : icon(mdiPlus)} Add
            </button>
          </div>
        </form>
      </sb-card>
      <sb-card heading="Commands" subheading="${this.commands.length} allowed">
        ${
          this.commands.length === 0
            ? html`<div class="empty">
                ${icon(mdiConsoleLine)}
                <p>No commands yet. Add one above.</p>
              </div>`
            : html`<div class="stack" style="--sb-stack-gap: var(--sb-space-3)">
                ${repeat(
                  this.commands,
                  (command) => command.id,
                  (command) => this.#renderCommand(command),
                )}
              </div>`
        }
      </sb-card>
    `;
  }

  override render() {
    return html`
      <div class="page narrow">
        ${this.renderHeader({
          heading: "Commands",
          description:
            "Commands that clients such as Home Assistant may run on this system. Nothing else can be run.",
          icon: mdiConsoleLine,
        })}
        ${this.renderResult(this.saveResult)}
        ${this.gate(
          () => this.#renderContent(),
          html`<span
            class="skeleton"
            style="min-height: 28rem; border-radius: var(--sb-radius-l)"
          ></span>`,
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-settings-commands": PageSettingsCommands;
  }
}
