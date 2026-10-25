import {
  mdiCheck,
  mdiClose,
  mdiConsoleLine,
  mdiContentCopy,
  mdiPlay,
  mdiPlus,
  mdiTrashCanOutline,
} from "@mdi/js";
import type {
  CommandPrefab,
  CommandResult,
  OmarchyTarget,
  Settings,
  SettingsCommandDefinition,
} from "@timmo001/effect-system-bridge";
import { Option, Struct } from "effect";
import { AsyncResult } from "effect/reactivity";
import { css, html, nothing, type TemplateResult } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";

import "~/components/sb-card";
import { icon, pageStyles, shared, spinner } from "~/components/shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import {
  actionResult,
  type BridgeError,
  type CommandChange,
  changeCommand,
  commandExecutions,
  commandPrefabs,
  errorMessage,
  executeCommand,
  latestModuleData,
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
  /** An Omarchy shell call's IPC target and function. */
  readonly target: string;
  readonly function: string;
}

const emptyForm: CommandForm = {
  prefab: "",
  name: "",
  command: "",
  workingDir: "",
  arguments: "",
  target: "",
  function: "",
};

/**
 * The prefab that calls an Omarchy shell IPC function. Its arguments are the
 * target, the function, then the function's own arguments.
 */
const omarchyIPC = "omarchy-ipc";

/** The parts of a saved command that can be edited one at a time. */
const editFields = {
  name: "name",
  command: "program",
  arguments: "arguments",
  workingDir: "working directory",
} as const;

type EditField = keyof typeof editFields;

const isEditField = (field: string | undefined): field is EditField =>
  field !== undefined && field in editFields;

/** The command with one part changed to what was typed. */
const withPart = (
  command: SettingsCommandDefinition,
  field: EditField,
  value: string,
): SettingsCommandDefinition => {
  switch (field) {
    case "name":
      return Struct.assign(command, { name: value });
    case "command":
      return Struct.assign(command, { command: value });
    case "workingDir":
      return Struct.assign(command, { workingDir: value });
    case "arguments":
      return Struct.assign(command, { arguments: splitArguments(value) });
  }
};

const splitArguments = (value: string) =>
  value
    .split(",")
    .map((argument) => argument.trim())
    .filter((argument) => argument !== "");

/** A prefab with no program runs inside System Bridge itself. */
const builtIn = "Built into System Bridge";

/** How a command shows in the list: the program it runs and its arguments. */
const commandLine = (command: string, args: readonly string[]) =>
  command === "" ? builtIn : [command, ...args].join(" ");

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
      /* Two lines a command: its name and actions, then what it runs */
      .command {
        display: flex;
        flex-direction: column;
        gap: var(--sb-space-1);
        padding: var(--sb-space-2) var(--sb-space-3);
        background: var(--sb-color-sunken);
        border-radius: var(--sb-radius-m);
      }

      .head {
        display: flex;
        align-items: center;
        gap: var(--sb-space-2);
      }

      .title {
        display: flex;
        flex: 1;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--sb-space-2);
        min-width: 0;
      }

      .actions {
        flex: none;
      }

      .title .chip {
        min-height: 1.25rem;
        padding: 0 var(--sb-space-2);
      }

      .details {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        column-gap: var(--sb-space-3);
        row-gap: var(--sb-space-1);
        font-size: var(--sb-font-size-xs);
      }

      .details code {
        font-size: var(--sb-font-size-xs);
        overflow-wrap: anywhere;
      }

      .details .id {
        display: inline-flex;
        align-items: center;
        margin-inline-start: auto;
        color: var(--sb-color-muted);
      }

      /* A part of a command that opens its edit popover */
      .editable {
        display: inline-flex;
        align-items: center;
        max-width: 100%;
        min-width: 0;
        padding: 0.125rem var(--sb-space-1);
        margin-inline: calc(-1 * var(--sb-space-1));
        font: inherit;
        color: inherit;
        text-align: start;
        cursor: pointer;
        background: none;
        border: 0;
        border-radius: var(--sb-radius-s);
      }

      .editable:hover:not(:disabled),
      .editable[aria-expanded="true"] {
        background: var(--sb-color-surface);
      }

      .editable:focus-visible {
        outline: 2px solid var(--sb-color-accent);
        outline-offset: 1px;
      }

      .editable:disabled {
        cursor: default;
      }

      .edit-popover {
        position: fixed;
        inset: unset;
        width: 22rem;
        max-width: calc(100vw - 1rem);
        margin: 0;
        padding: var(--sb-space-3);
        color: var(--sb-color-text);
        background: var(--sb-color-raised);
        border: 1px solid var(--sb-color-border);
        border-radius: var(--sb-radius-l);
        box-shadow: var(--sb-shadow-l);
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

  readonly #modules = new AtomController(this, () => latestModuleData);

  @state() private commands: readonly SettingsCommandDefinition[] = [];

  @state() private form: CommandForm = emptyForm;

  /** The part of a command being edited, with what's typed so far. */
  @state() private editing: {
    readonly id: string;
    readonly field: EditField;
    readonly value: string;
  } | null = null;

  @query("#edit-popover") private editPopover!: HTMLElement | null;

  @query("#edit-value") private editInput!: HTMLInputElement | null;

  /** The edit button the popover opened from. */
  #editAnchor: HTMLButtonElement | null = null;

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

  readonly #change = new AtomController(this, () => changeCommand);

  /** Saving covers command changes as well as settings. */
  protected override get isSaving(): boolean {
    return super.isSaving || this.#change.value.waiting;
  }

  /**
   * Sends just the one change, so the backend keeps any other client's
   * changes to the other commands.
   */
  #save(change: CommandChange) {
    registry.set(changeCommand, change);
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

    if (id !== undefined) this.#save({ kind: "remove", id });
  };

  /** Opens the popover for one part of a command, beside its edit button. */
  #onEditStart = (event: MouseEvent) => {
    const button = event.currentTarget;

    if (!(button instanceof HTMLButtonElement)) return;

    const command = this.commands.find(({ id }) => id === button.dataset.id);
    const field = button.dataset.field;

    if (command === undefined || !isEditField(field)) return;

    this.#editAnchor = button;
    this.editing = {
      id: command.id,
      field,
      value:
        field === "arguments" ? command.arguments.join(", ") : command[field],
    };
    this.editPopover?.showPopover();
  };

  #onEditInput = (event: InputEvent) => {
    if (this.editing !== null && event.target instanceof HTMLInputElement) {
      this.editing = { ...this.editing, value: event.target.value };
    }
  };

  #onEditCancel = () => {
    this.editPopover?.hidePopover();
  };

  /**
   * Saves just this part. The ID stays, so clients using the command carry on.
   * The backend checks a new program or folder like any other command.
   */
  #onEditSubmit = (event: SubmitEvent) => {
    event.preventDefault();

    const editing = this.editing;

    if (editing === null || !this.#canSaveEdit()) return;

    const value = editing.value.trim();

    const command = this.commands.find(({ id }) => id === editing.id);

    this.editPopover?.hidePopover();

    if (command !== undefined) {
      this.#save({
        kind: "update",
        command: withPart(command, editing.field, value),
      });
    }
  };

  /** A name can't be empty, nor can a custom command's program. */
  #canSaveEdit(): boolean {
    const editing = this.editing;

    if (editing === null) return false;

    const command = this.commands.find(({ id }) => id === editing.id);
    const empty = editing.value.trim() === "";

    if (editing.field === "name") return !empty;

    if (editing.field === "command") return !empty || command?.prefab !== "";

    return true;
  }

  #positionEdit = () => {
    const anchor = this.#editAnchor;
    const popover = this.editPopover;

    if (anchor === null || popover === null) return;

    const rect = anchor.getBoundingClientRect();
    const gap = 6;
    const below = window.innerHeight - rect.bottom - gap;

    const top =
      below >= popover.offsetHeight || below >= rect.top
        ? rect.bottom + gap
        : Math.max(gap, rect.top - gap - popover.offsetHeight);

    const left = Math.min(
      Math.max(gap, rect.left),
      window.innerWidth - popover.offsetWidth - gap,
    );

    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
  };

  /** Keeps the popover by its button, and returns focus to it on close. */
  #onEditToggle = (event: ToggleEvent) => {
    if (event.newState === "open") {
      this.#positionEdit();
      window.addEventListener("resize", this.#positionEdit);
      window.addEventListener("scroll", this.#positionEdit, true);
      void this.updateComplete.then(() => {
        this.editInput?.focus();
        this.editInput?.select();
      });

      return;
    }

    window.removeEventListener("resize", this.#positionEdit);
    window.removeEventListener("scroll", this.#positionEdit, true);
    this.#editAnchor?.focus();
    this.#editAnchor = null;
    this.editing = null;
  };

  override disconnectedCallback(): void {
    window.removeEventListener("resize", this.#positionEdit);
    window.removeEventListener("scroll", this.#positionEdit, true);
    super.disconnectedCallback();
  }

  /** The prefabs the backend has, or none until they load. */
  get #prefabList(): readonly CommandPrefab[] {
    return Option.getOrElse(AsyncResult.value(this.#prefabs.value), () => []);
  }

  #prefab(id: string): CommandPrefab | undefined {
    return id === ""
      ? undefined
      : this.#prefabList.find((prefab) => prefab.id === id);
  }

  /** The Omarchy shell's IPC targets, from the desktop module. */
  get #omarchyTargets(): readonly OmarchyTarget[] {
    return this.#modules.value.desktop?.omarchy?.targets ?? [];
  }

  /** Picking a target starts its function afresh. */
  #onIpcChange = (event: Event) => {
    const target = event.target;

    if (!(target instanceof HTMLSelectElement)) return;

    this.form =
      target.name === "target"
        ? { ...this.form, target: target.value, function: "" }
        : { ...this.form, function: target.value };
  };

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

    if (name.trim() === "") return false;

    if (prefab === omarchyIPC) {
      return this.form.target !== "" && this.form.function !== "";
    }

    return prefab !== "" || command.trim() !== "";
  }

  /** What a new command runs with, from the form. */
  #formArguments(): readonly string[] {
    const { prefab, command, target } = this.form;

    if (prefab === omarchyIPC) {
      return [
        target,
        this.form.function,
        ...splitArguments(this.form.arguments),
      ];
    }

    // Without a program of its own, a prefab uses its own arguments
    return prefab !== "" && command.trim() === ""
      ? []
      : splitArguments(this.form.arguments);
  }

  #onSubmit = (event: SubmitEvent) => {
    event.preventDefault();

    if (!this.#canAdd()) return;

    const { prefab, name, command, workingDir } = this.form;

    const definition: SettingsCommandDefinition = {
      id: generateUUID(),
      name: name.trim(),
      prefab,
      // Empty keeps the prefab's own program
      command: prefab === omarchyIPC ? "" : command.trim(),
      workingDir: workingDir.trim(),
      arguments: this.#formArguments(),
    };

    this.#adding = definition.id;
    this.#save({ kind: "add", command: definition });
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

    // The badge only adds anything when the name doesn't already say it
    let badge = "";

    if (command.prefab !== "") {
      const prefabName = prefab?.name ?? command.prefab;

      if (!usesPrefab) badge = `${prefabName}, your program`;
      else if (prefabName !== command.name) badge = prefabName;
    }

    return html`
      <div class="command">
        <div class="head">
          <div class="title">
            ${this.#editButton(
              command,
              "name",
              html`<strong>${command.name}</strong>`,
            )}
            ${
              badge === ""
                ? nothing
                : html`<span class="chip info small">${badge}</span>`
            }
            ${
              unavailable === undefined
                ? nothing
                : html`<span
                    class="chip danger small"
                    id="unavailable-${command.id}"
                    >${unavailable}</span
                  >`
            }
          </div>
          <div class="row actions">
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
        <div class="details">
          ${this.#renderRuns(command, prefab, usesPrefab)}
          <span class="id">
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
        ${this.#renderOutcome(
          execution === undefined || running ? undefined : outcome(execution),
        )}
      </div>
    `;
  }

  /** One part of a command, which opens the edit popover for it. */
  #editButton(
    command: SettingsCommandDefinition,
    field: EditField,
    content: TemplateResult,
  ) {
    const open =
      this.editing?.id === command.id && this.editing.field === field;

    return html`<button
      class="editable"
      type="button"
      aria-label="Edit the ${editFields[field]} of ${command.name}"
      aria-haspopup="dialog"
      aria-controls="edit-popover"
      aria-expanded=${open ? "true" : "false"}
      ?disabled=${this.isSaving}
      data-id=${command.id}
      data-field=${field}
      @click=${this.#onEditStart}
    >
      ${content}
    </button>`;
  }

  /**
   * What a command runs: its program and arguments, each its own button. A
   * prefab with no program of its own shows the one it runs, and an Omarchy
   * shell call shows the call.
   */
  #renderRuns(
    command: SettingsCommandDefinition,
    prefab: CommandPrefab | undefined,
    usesPrefab: boolean,
  ) {
    if (command.prefab === omarchyIPC) {
      return this.#editButton(
        command,
        "arguments",
        html`<code>${command.arguments.join(" ")}</code>`,
      );
    }

    let program = html`<code>${command.command}</code>`;

    if (usesPrefab) {
      program =
        prefab?.available === true
          ? html`<code>${commandLine(prefab.command, prefab.arguments)}</code>`
          : html`<span class="muted">not available here</span>`;
    }

    return html`
      ${this.#editButton(command, "command", program)}
      ${
        usesPrefab
          ? nothing
          : this.#editButton(
              command,
              "arguments",
              command.arguments.length === 0
                ? html`<span class="muted">no arguments</span>`
                : html`<code>${command.arguments.join(" ")}</code>`,
            )
      }
      ${this.#editButton(
        command,
        "workingDir",
        html`<span class="muted"
          >${
            command.workingDir === ""
              ? "no working directory"
              : `in ${command.workingDir}`
          }</span
        >`,
      )}
    `;
  }

  /** The popover that edits one part of a command, by the part's button. */
  #renderEditPopover() {
    const editing = this.editing;
    const command = this.commands.find(({ id }) => id === editing?.id);
    const field = editing?.field ?? "name";

    let hint = "What the command is called in lists.";

    if (field === "command") {
      hint =
        command?.prefab === ""
          ? "The program's full path."
          : "Your own program's full path, or leave it empty to use the prefab's.";
    } else if (field === "arguments") {
      hint =
        command?.prefab === omarchyIPC
          ? "The target, the function, then its arguments, separated by commas."
          : "Separated by commas.";
    } else if (field === "workingDir") {
      hint = "Where the program runs. Leave it empty for none.";
    }

    return html`
      <div
        id="edit-popover"
        class="edit-popover"
        popover
        role="dialog"
        aria-labelledby="edit-heading"
        @toggle=${this.#onEditToggle}
      >
        <form class="stack" @submit=${this.#onEditSubmit}>
          <label id="edit-heading" for="edit-value"
            >Edit the
            ${editFields[field]}${
              command === undefined ? "" : ` of ${command.name}`
            }</label
          >
          <input
            id="edit-value"
            class="input ${field === "name" ? "" : "mono"}"
            aria-describedby="edit-hint"
            .value=${editing?.value ?? ""}
            @input=${this.#onEditInput}
          />
          <span class="hint" id="edit-hint">${hint}</span>
          <div class="row" style="justify-content: flex-end">
            <button
              class="button plain small"
              type="button"
              @click=${this.#onEditCancel}
            >
              ${icon(mdiClose)} Cancel
            </button>
            <button
              class="button filled small"
              type="submit"
              ?disabled=${this.isSaving || !this.#canSaveEdit()}
            >
              ${icon(mdiCheck)} Save
            </button>
          </div>
        </form>
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

  #ipcSelect(
    key: "target" | "function",
    label: string,
    options: readonly TemplateResult[],
    hint: string,
  ) {
    return html`
      <div class="field">
        <label for="ipc-${key}">${label}</label>
        <select
          class="input mono"
          id="ipc-${key}"
          name=${key}
          aria-describedby="ipc-${key}-hint"
          required
          ?disabled=${this.isSaving}
          .value=${this.form[key]}
          @change=${this.#onIpcChange}
        >
          <option value="">Choose…</option>
          ${options}
        </select>
        <span class="hint" id="ipc-${key}-hint">${hint}</span>
      </div>
    `;
  }

  /** An Omarchy shell call's target, function and the function's arguments. */
  #renderIpcFields() {
    const targets = this.#omarchyTargets;
    const target = targets.find(({ name }) => name === this.form.target);
    const functions = target?.functions ?? [];
    const chosen = functions.find(({ name }) => name === this.form.function);

    const signature = (
      argumentsList: OmarchyTarget["functions"][number]["arguments"],
    ) => argumentsList.map(({ name, type }) => `${name}: ${type}`).join(", ");

    const targetOptions = targets.map(
      ({ name }) =>
        html`<option value=${name} ?selected=${name === this.form.target}>
          ${name}
        </option>`,
    );

    const functionOptions = functions.map(
      ({ name, arguments: argumentsList }) =>
        html`<option value=${name} ?selected=${name === this.form.function}>
          ${name}(${signature(argumentsList)})
        </option>`,
    );

    let argumentsHint = "Pick a function to see what it takes.";

    if (chosen !== undefined) {
      argumentsHint =
        chosen.arguments.length === 0
          ? "This function takes none."
          : `Separated by commas, in order: ${signature(chosen.arguments)}.`;
    }

    return html`
      ${this.#ipcSelect(
        "target",
        "Target",
        targetOptions,
        "An IPC target the Omarchy shell answers to.",
      )}
      ${this.#ipcSelect(
        "function",
        "Function",
        functionOptions,
        "What to call on it. Its answer is the command's output.",
      )}
      ${this.#input("arguments", "Arguments", "", argumentsHint)}
    `;
  }

  /** A program and its arguments, for a custom command or a prefab's override. */
  #renderProgramFields(prefab: CommandPrefab | undefined) {
    return html`
      ${this.#input(
        "command",
        "Command",
        prefab === undefined ? "/usr/bin/systemctl" : prefab.command || builtIn,
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
            ${
              this.form.prefab === omarchyIPC
                ? this.#renderIpcFields()
                : this.#renderProgramFields(prefab)
            }
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
      ${this.#renderEditPopover()}
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
        ${this.renderResult(actionResult(this.#change.value, "Command saved."))}
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
