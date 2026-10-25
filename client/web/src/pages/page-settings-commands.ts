import {
  mdiConsoleLine,
  mdiContentCopy,
  mdiPlay,
  mdiPlus,
  mdiTrashCanOutline,
} from "@mdi/js";
import type {
  CommandPrefab,
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
  commandPrefabs,
  errorMessage,
  executeCommand,
  registry,
} from "~/lib/atoms";
import { generateUUID } from "~/lib/utils";

import { SbSettingsPage } from "./sb-settings-page";

type CommandOutcome = Omit<CommandResult, "commandID">;

interface CommandForm {
  /** A prefab's ID, or empty for a custom command. */
  readonly prefab: string;
  readonly name: string;
  readonly command: string;
  readonly workingDir: string;
  readonly arguments: string;
}

const emptyForm: CommandForm = {
  prefab: "",
  name: "",
  command: "",
  workingDir: "",
  arguments: "",
};

/** How a command shows in the list: the program it runs and its arguments. */
const commandLine = (command: string, args: readonly string[]) =>
  [command, ...args].join(" ");

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

  readonly #prefabs = new AtomController(this, () => commandPrefabs);

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

  /** The prefabs the backend has, or none until they load. */
  get #prefabList(): readonly CommandPrefab[] {
    return Option.getOrElse(AsyncResult.value(this.#prefabs.value), () => []);
  }

  #prefab(id: string): CommandPrefab | undefined {
    return id === ""
      ? undefined
      : this.#prefabList.find((prefab) => prefab.id === id);
  }

  /** Fields are named after their key in the form. */
  #onInput = (event: InputEvent) => {
    const target = event.target;

    if (target instanceof HTMLInputElement && isFormKey(target.name)) {
      this.form = { ...this.form, [target.name]: target.value };
    }
  };

  /** Picking a prefab names the command after it, unless it has a name of its own. */
  #onPrefabChange = (event: Event) => {
    if (!(event.target instanceof HTMLSelectElement)) return;

    const previous = this.#prefab(this.form.prefab);
    const next = this.#prefab(event.target.value);

    const named =
      this.form.name.trim() !== "" && this.form.name !== previous?.name;

    this.form = {
      ...this.form,
      prefab: event.target.value,
      name: named ? this.form.name : (next?.name ?? ""),
    };
  };

  #canAdd(): boolean {
    const { prefab, name, command } = this.form;

    return name.trim() !== "" && (prefab !== "" || command.trim() !== "");
  }

  #onSubmit = (event: SubmitEvent) => {
    event.preventDefault();

    if (!this.#canAdd()) return;

    const { prefab, name, command, workingDir } = this.form;

    const definition: SettingsCommandDefinition = {
      id: generateUUID(),
      name: name.trim(),
      prefab,
      // Empty keeps the prefab's own program, and its arguments with it
      command: command.trim(),
      workingDir: workingDir.trim(),
      arguments:
        command.trim() === ""
          ? []
          : this.form.arguments
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
          aria-describedby=${hint === undefined ? nothing : `${key}-hint`}
          ?required=${
            key === "name" || (key === "command" && this.form.prefab === "")
          }
          ?disabled=${this.isSaving}
          .value=${this.form[key]}
          @input=${this.#onInput}
        />
        ${
          hint === undefined
            ? nothing
            : html`<span class="hint" id="${key}-hint">${hint}</span>`
        }
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
    const prefab = this.#prefab(command.prefab);
    // With no program of its own, a prefab runs the one the backend finds
    const usesPrefab = command.prefab !== "" && command.command === "";

    const unavailable =
      usesPrefab && prefab !== undefined && !prefab.available
        ? prefab.reason
        : undefined;

    let line: string | undefined = commandLine(
      command.command,
      command.arguments,
    );

    if (usesPrefab) {
      line =
        prefab?.available === true
          ? commandLine(prefab.command, prefab.arguments)
          : undefined;
    }

    return html`
      <div class="command">
        <div class="row wrap" style="align-items: flex-start">
          <div
            class="stack"
            style="flex: 1; min-width: 12rem; --sb-stack-gap: var(--sb-space-1)"
          >
            <strong>${command.name}</strong>
            ${
              command.prefab === ""
                ? nothing
                : html`<span class="chip info" style="align-self: start">
                    ${prefab?.name ?? command.prefab}
                    ${usesPrefab ? "prefab" : "prefab, with your program"}
                  </span>`
            }
            ${line === undefined ? nothing : html`<code>${line}</code>`}
            ${
              unavailable === undefined
                ? nothing
                : html`<span
                    class="chip danger"
                    style="align-self: start"
                    id="unavailable-${command.id}"
                    >${unavailable}</span
                  >`
            }
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
              aria-describedby=${
                unavailable === undefined
                  ? nothing
                  : `unavailable-${command.id}`
              }
              ?disabled=${running || this.isSaving || unavailable !== undefined}
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

  #renderPrefabSelect() {
    const options = this.#prefabList.map(
      (prefab) =>
        html`<option
          value=${prefab.id}
          ?disabled=${!prefab.available}
          ?selected=${prefab.id === this.form.prefab}
        >
          ${prefab.available ? prefab.name : `${prefab.name}: ${prefab.reason}`}
        </option>`,
    );

    return html`
      <div class="field">
        <label for="prefab">Type</label>
        <select
          class="input"
          id="prefab"
          name="prefab"
          aria-describedby="prefab-hint"
          ?disabled=${this.isSaving}
          .value=${this.form.prefab}
          @change=${this.#onPrefabChange}
        >
          <option value="">Custom</option>
          ${options}
        </select>
        <span class="hint" id="prefab-hint"
          >A ready-made command, or your own program.</span
        >
      </div>
    `;
  }

  #renderContent() {
    const saving = this.isSaving;
    const prefab = this.#prefab(this.form.prefab);

    return html`
      <sb-card heading="Add a command">
        <form class="stack" @submit=${this.#onSubmit}>
          <div class="grid" style="--sb-grid-min: 16rem">
            ${this.#renderPrefabSelect()}
            ${this.#input("name", "Name", prefab?.name ?? "Restart audio")}
            ${this.#input(
              "command",
              "Command",
              prefab?.command || "/usr/bin/systemctl",
              prefab === undefined
                ? "The program's full path."
                : "Optional. Leave empty to use the program shown, or give your own program's full path.",
            )}
            ${this.#input(
              "arguments",
              "Arguments",
              prefab === undefined
                ? "--user, restart, pipewire"
                : prefab.arguments.join(", "),
              prefab === undefined
                ? "Separated by commas."
                : "Separated by commas. Only used with your own program.",
            )}
            ${this.#input("workingDir", "Working directory", "/home/me", "Optional.")}
          </div>
          <div class="row" style="justify-content: flex-end">
            <button
              class="button filled"
              type="submit"
              ?disabled=${saving || !this.#canAdd()}
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
