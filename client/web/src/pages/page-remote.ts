import {
  mdiArrowDown,
  mdiArrowLeft,
  mdiArrowRight,
  mdiArrowUp,
  mdiBackspaceOutline,
  mdiClipboardArrowDownOutline,
  mdiClipboardArrowUpOutline,
  mdiCogOutline,
  mdiKeyboardReturn,
  mdiKeyboardTab,
  mdiPlay,
  mdiRefresh,
  mdiRemote,
  mdiSend,
} from "@mdi/js";
import type {
  DesktopData,
  KeyboardKeypress,
  SettingsCommandDefinition,
} from "@timmo001/effect-system-bridge";
import { Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { css, html, nothing, type TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";

import "@timmo001/groundwork-ui/define/gw-action-button.ts";
import "@timmo001/groundwork-ui/define/gw-chip.ts";
import "@timmo001/groundwork-ui/define/gw-copy.ts";
import "~/components/sb-command-outcome";
import "~/components/sb-trackpad";
import { pageStyles, shared } from "~/components/shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import {
  actionResult,
  commandExecutions,
  errorMessage,
  executeCommand,
  getClipboard,
  inputStatus,
  latestModuleData,
  registry,
  runAction,
  sendInput,
  setClipboard,
  settings,
} from "~/lib/atoms";
import { moduleInfo } from "~/lib/navigation";
import { href } from "~/lib/router";

import "./page-open";
import { SbPage } from "./sb-page";

/** Presses a key, with any modifiers, as `gw-action-button`'s `action`. */
const press =
  (key: string, modifiers: readonly string[] = []) =>
  (): Promise<void> =>
    sendInput((bridge) =>
      bridge.keyboardKeypress({ key, modifiers, delay: 0 }),
    );

interface Key {
  readonly label: string;
  readonly icon?: string;
  readonly action: () => Promise<void>;
}

const key = (
  label: string,
  name: string,
  modifiers?: KeyboardKeypress["modifiers"],
  icon?: string,
): Key => ({ label, icon, action: press(name, modifiers) });

const editingKeys: readonly Key[] = [
  key("Enter", "enter", [], mdiKeyboardReturn),
  key("Backspace", "backspace", [], mdiBackspaceOutline),
  key("Tab", "tab", [], mdiKeyboardTab),
  key("Delete", "delete"),
];

/** Arrow keys, in the order of an inverted T: up, then left, down, right. */
const arrowKeys: readonly Key[] = [
  key("Up", "up", [], mdiArrowUp),
  key("Left", "left", [], mdiArrowLeft),
  key("Down", "down", [], mdiArrowDown),
  key("Right", "right", [], mdiArrowRight),
];

/** Shortcuts, with Cmd in place of Ctrl and Alt on a Mac. */
const shortcutsFor = (mac: boolean): readonly Key[] => {
  const primary = mac ? "cmd" : "ctrl";

  return [
    key(mac ? "Cmd+Tab" : "Alt+Tab", "tab", [mac ? "cmd" : "alt"]),
    key(mac ? "Cmd" : "Super", "cmd"),
    key("Esc", "esc"),
    key("Copy", "c", [primary]),
    key("Paste", "v", [primary]),
    key("Cut", "x", [primary]),
    key("Undo", "z", [primary]),
    key("Select all", "a", [primary]),
  ];
};

const shortcuts = { mac: shortcutsFor(true), other: shortcutsFor(false) };

const functionKeys: readonly Key[] = Array.from({ length: 12 }, (_, index) =>
  key(`F${index + 1}`, `f${index + 1}`),
);

/** Links to the pages with the controls Remote leaves to them. */
const otherControls = (
  ["media", "audio", "displays", "desktop", "bluetooth", "system"] as const
).map(
  (module) => html`
    <li>
      <gw-card
        level="3"
        href=${href("module", { params: { module } })}
        icon=${moduleInfo[module].icon}
        heading=${moduleInfo[module].label}
      ></gw-card>
    </li>
  `,
);

const commandsHref = href("module", {
  params: { module: "system" },
  hash: "commands",
});

const placeholder = html`<gw-skeleton
  style="min-height: 24rem; border-radius: var(--gw-radius-l)"
></gw-skeleton>`;

/**
 * Control the computer from here: a trackpad, the keyboard, shortcuts,
 * windows and workspaces, the clipboard, opening things and saved commands.
 * The rest of its controls are on their own pages, linked at the end.
 */
@customElement("page-remote")
export class PageRemote extends SbPage {
  static override styles = [
    shared,
    pageStyles,
    css`
      .panels {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 24rem), 1fr));
        gap: var(--gw-space-6);
        align-items: start;
      }

      .keys {
        display: flex;
        flex-wrap: wrap;
        gap: var(--gw-space-2);
      }

      .arrows {
        display: grid;
        grid-template-columns: repeat(3, auto);
        gap: var(--gw-space-2);
        justify-content: start;
      }

      .arrows > :first-child {
        grid-column: 2;
      }

      .arrows > :nth-child(2) {
        grid-column: 1;
      }

      .list {
        display: flex;
        flex-direction: column;
        gap: var(--gw-space-2);
        padding: 0;
        margin: 0;
        list-style: none;
      }

      .item {
        display: flex;
        flex-direction: column;
        gap: var(--gw-space-2);
        padding: var(--gw-space-2) var(--gw-space-3);
        background: var(--gw-color-surface-lower);
        border-radius: var(--gw-radius-m);
      }

      .item .row {
        min-width: 0;
      }

      .item .label {
        flex: 1;
        min-width: 0;
      }

      .links {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(min(100%, 14rem), 1fr));
        gap: var(--gw-space-3);
        padding: 0;
        margin: 0;
        list-style: none;
      }

      pre {
        margin: 0;
        max-height: 10rem;
        padding: var(--gw-space-3);
        overflow: auto;
        font-size: var(--gw-font-size-xs);
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        background: var(--gw-color-surface-raised);
        border: 1px solid var(--gw-color-border-normal);
        border-radius: var(--gw-radius-m);
      }
    `,
  ];

  readonly #status = new AtomController(this, () => inputStatus);

  readonly #modules = new AtomController(this, () => latestModuleData);

  readonly #settings = new AtomController(this, () => settings);

  readonly #executions = new AtomController(this, () =>
    commandExecutions(
      this.#commands()
        .map((command) => command.id)
        .join("\n"),
    ),
  );

  readonly #clipboard = new AtomController(this, () => getClipboard);

  readonly #setClipboard = new AtomController(this, () => setClipboard);

  /** Why the last input failed, until the next works or Try again. */
  @state() private inputError: string | null = null;

  @state() private text = "";

  @state() private typing = false;

  @state() private clipboardText = "";

  protected readonly pageTitle = "Remote";

  #commands(): readonly SettingsCommandDefinition[] {
    return Option.match(AsyncResult.value(this.#settings.value), {
      onNone: () => [],
      onSome: (current) => current.commands.allowlist,
    });
  }

  #onFailed = (event: CustomEvent<{ message: string }>) => {
    this.inputError = event.detail.message;
  };

  #onDone = () => {
    this.inputError = null;
  };

  #onRetry = () => {
    this.inputError = null;
    registry.refresh(inputStatus);
  };

  #onText = (event: Event) => {
    if (event.target instanceof HTMLInputElement) {
      this.text = event.target.value;
    }
  };

  #onType = async (event: SubmitEvent) => {
    event.preventDefault();

    const text = this.text;

    if (text === "" || this.typing) return;

    this.typing = true;

    try {
      await sendInput((bridge) => bridge.keyboardText({ text, delay: 0 }));
      this.text = "";
      this.inputError = null;
    } catch (error) {
      this.inputError =
        error instanceof Error ? error.message : "Typing failed";
    } finally {
      this.typing = false;
    }
  };

  #onClipboardText = (event: Event) => {
    if (event.target instanceof HTMLTextAreaElement) {
      this.clipboardText = event.target.value;
    }
  };

  #onSendClipboard = (event: SubmitEvent) => {
    event.preventDefault();

    if (this.clipboardText === "") return;

    registry.set(setClipboard, this.clipboardText);
  };

  #onRun = (event: MouseEvent) => {
    const id =
      event.currentTarget instanceof HTMLElement
        ? event.currentTarget.dataset.id
        : undefined;

    if (id !== undefined) registry.set(executeCommand(id), undefined);
  };

  /** Why input can't be sent, or null when it can. */
  #inputProblem(): {
    readonly checking: boolean;
    readonly reason: string;
  } | null {
    const status = this.#status.value;

    if (AsyncResult.isFailure(status)) {
      return {
        checking: status.waiting,
        reason: Option.match(AsyncResult.error(status), {
          onNone: () => "Couldn't check how to send input",
          onSome: errorMessage,
        }),
      };
    }

    if (!AsyncResult.isSuccess(status)) {
      return {
        checking: true,
        reason:
          "Checking how to send input. On GNOME or KDE, allow remote control on the computer when it asks.",
      };
    }

    if (status.value.available) return null;

    return {
      checking: status.waiting,
      reason: status.value.reason ?? "Input isn't available on this system",
    };
  }

  #renderInputAlert(
    problem: { readonly checking: boolean; readonly reason: string } | null,
  ) {
    if (problem !== null) {
      return html`
        <gw-alert
          tone=${problem.checking ? "info" : "warning"}
          heading=${problem.checking ? "Checking input" : "Input isn't available"}
        >
          ${problem.reason} The trackpad, keyboard and shortcuts need it; the
          rest of Remote works without.
          <gw-button
            slot="actions"
            size="small"
            icon=${mdiRefresh}
            ?loading=${problem.checking}
            @click=${this.#onRetry}
            >Try again</gw-button
          >
        </gw-alert>
      `;
    }

    if (this.inputError === null) return nothing;

    return html`
      <gw-alert tone="danger" heading="That didn't work">
        ${this.inputError}
        <gw-button
          slot="actions"
          size="small"
          icon=${mdiRefresh}
          @click=${this.#onRetry}
          >Try again</gw-button
        >
      </gw-alert>
    `;
  }

  #renderKeys(keys: readonly Key[], disabled: boolean) {
    return keys.map(
      (item) => html`
        <gw-action-button
          quiet
          size="small"
          appearance="filled"
          variant="neutral"
          icon=${item.icon ?? ""}
          labels=${item.icon === undefined ? "show" : "hide"}
          done-label=${item.label}
          ?disabled=${disabled}
          .action=${item.action}
          @done=${this.#onDone}
          @failed=${this.#onFailed}
          >${item.label}</gw-action-button
        >
      `,
    );
  }

  #renderTrackpad(disabled: boolean) {
    return html`
      <gw-card level="2" heading="Trackpad">
        <sb-trackpad
          ?disabled=${disabled}
          @failed=${this.#onFailed}
        ></sb-trackpad>
      </gw-card>
    `;
  }

  #renderKeyboard(disabled: boolean) {
    return html`
      <gw-card level="2" heading="Keyboard">
        <div class="stack">
          <form class="row" @submit=${this.#onType}>
            <gw-input
              style="flex: 1"
              label="Text to type"
              label-hidden
              placeholder="Type here, then Send"
              autocomplete="off"
              ?disabled=${disabled}
              .value=${this.text}
              @input=${this.#onText}
            ></gw-input>
            <gw-button
              type="submit"
              icon=${mdiSend}
              labels="hide"
              ?loading=${this.typing}
              ?disabled=${disabled || this.text === ""}
              >Send</gw-button
            >
          </form>
          <div class="keys">${this.#renderKeys(editingKeys, disabled)}</div>
          <div class="arrows">${this.#renderKeys(arrowKeys, disabled)}</div>
        </div>
      </gw-card>
    `;
  }

  #renderShortcuts(disabled: boolean, mac: boolean) {
    return html`
      <gw-card level="2" heading="Shortcuts">
        <div class="stack">
          <div class="keys">
            ${this.#renderKeys(mac ? shortcuts.mac : shortcuts.other, disabled)}
          </div>
          <div class="keys">${this.#renderKeys(functionKeys, disabled)}</div>
        </div>
      </gw-card>
    `;
  }

  #renderDesktop(desktop: DesktopData | undefined) {
    const windows = desktop?.windows ?? [];

    // Windows can't switch workspaces for you
    const workspaces =
      desktop?.compositor === "windows"
        ? []
        : (desktop?.workspaces ?? []).filter(
            (workspace) => workspace.special !== true,
          );

    return html`
      <gw-card level="2" heading="Windows and workspaces">
        ${
          windows.length === 0 && workspaces.length === 0
            ? html`<p class="muted small">
                No windows or workspaces reported by this desktop.
              </p>`
            : html`<div class="stack">
                ${
                  workspaces.length === 0
                    ? nothing
                    : html`<div class="keys" aria-label="Workspaces">
                        ${repeat(
                          workspaces,
                          (workspace) => workspace.id,
                          (workspace) => html`
                            <gw-action-button
                              size="small"
                              appearance=${workspace.focused ? "accent" : "filled"}
                              variant=${workspace.focused ? "brand" : "neutral"}
                              done-label=${workspace.name ?? workspace.id}
                              .action=${this.#showWorkspace(workspace.id)}
                              >${workspace.name ?? workspace.id}</gw-action-button
                            >
                          `,
                        )}
                      </div>`
                }
                <ul class="list" aria-label="Windows">
                  ${repeat(
                    windows,
                    (window) => window.id,
                    (window) => html`
                      <li class="item">
                        <div class="row">
                          <div class="label">
                            <div class="truncate">
                              ${window.title ?? window.app ?? window.id}
                            </div>
                            ${
                              window.app && window.title
                                ? html`<div class="muted xsmall truncate">
                                    ${window.app}
                                  </div>`
                                : nothing
                            }
                          </div>
                          ${
                            window.focused
                              ? html`<gw-chip size="small" tone="accent"
                                  >Focused</gw-chip
                                >`
                              : html`<gw-action-button
                                  size="small"
                                  appearance="plain"
                                  done-label="Focused"
                                  .action=${this.#focusWindow(window.id)}
                                  >Focus</gw-action-button
                                >`
                          }
                        </div>
                      </li>
                    `,
                  )}
                </ul>
              </div>`
        }
      </gw-card>
    `;
  }

  /** Cached per ID, so a redraw doesn't hand the buttons a new action. */
  readonly #windowActions = new Map<string, () => Promise<void>>();

  readonly #workspaceActions = new Map<string, () => Promise<void>>();

  #focusWindow(id: string) {
    let action = this.#windowActions.get(id);

    if (action === undefined) {
      action = () => sendInput((bridge) => bridge.desktopFocusWindow({ id }));
      this.#windowActions.set(id, action);
    }

    return action;
  }

  #showWorkspace(id: string) {
    let action = this.#workspaceActions.get(id);

    if (action === undefined) {
      action = () =>
        sendInput((bridge) => bridge.desktopFocusWorkspace({ id }));
      this.#workspaceActions.set(id, action);
    }

    return action;
  }

  #renderClipboard() {
    const fetched = Option.getOrUndefined(
      AsyncResult.value(this.#clipboard.value),
    );

    const sent = actionResult(
      this.#setClipboard.value,
      "Sent to the computer's clipboard.",
    );

    return html`
      <gw-card level="2" heading="Clipboard">
        <div class="stack">
          <form class="stack" @submit=${this.#onSendClipboard}>
            <gw-input
              multiline
              rows="2"
              label="Text for the computer's clipboard"
              .value=${this.clipboardText}
              @input=${this.#onClipboardText}
            ></gw-input>
            <div class="row wrap">
              <gw-button
                type="submit"
                size="small"
                icon=${mdiClipboardArrowUpOutline}
                ?loading=${this.#setClipboard.value.waiting}
                ?disabled=${this.clipboardText === ""}
                >Send</gw-button
              >
              <gw-action-button
                size="small"
                appearance="filled"
                variant="neutral"
                icon=${mdiClipboardArrowDownOutline}
                done-label="Fetched"
                .action=${runAction(getClipboard)}
                >Get from the computer</gw-action-button
              >
            </div>
          </form>
          ${
            sent === null
              ? nothing
              : html`<p
                  class=${sent.success ? "muted small" : "error-text"}
                  role=${sent.success ? "status" : "alert"}
                >
                  ${sent.message}
                </p>`
          }
          ${
            fetched === undefined
              ? nothing
              : html`<div
                  class="stack"
                  style="--sb-stack-gap: var(--gw-space-2)"
                >
                  <div class="row">
                    <span class="muted small spacer">On the computer now</span>
                    <gw-copy
                      value=${fetched.text}
                      label="Copy the computer's clipboard"
                      labels="hide"
                    ></gw-copy>
                  </div>
                  ${
                    fetched.text === ""
                      ? html`<p class="muted small">It's empty.</p>`
                      : html`<pre>${fetched.text}</pre>`
                  }
                </div>`
          }
        </div>
      </gw-card>
    `;
  }

  #renderCommands() {
    const commands = this.#commands();

    return html`
      <gw-card level="2" heading="Commands">
        <div class="stack">
          ${
            commands.length === 0
              ? html`<p class="muted small">
                  No commands saved yet. Add one, or pick a ready-made one, in
                  the Commands settings.
                </p>`
              : html`<ul class="list">
                  ${repeat(
                    commands,
                    (command) => command.id,
                    (command) => {
                      const execution = this.#executions.value.get(command.id);

                      return html`
                        <li class="item">
                          <div class="row">
                            <span class="label truncate">${command.name}</span>
                            <gw-button
                              size="small"
                              appearance="filled"
                              icon=${mdiPlay}
                              data-id=${command.id}
                              ?loading=${execution?.waiting ?? false}
                              @click=${this.#onRun}
                              >Run</gw-button
                            >
                          </div>
                          <sb-command-outcome
                            .execution=${execution}
                          ></sb-command-outcome>
                        </li>
                      `;
                    },
                  )}
                </ul>`
          }
          <gw-button
            style="align-self: start"
            size="small"
            appearance="plain"
            icon=${mdiCogOutline}
            href=${commandsHref}
            >Commands settings</gw-button
          >
        </div>
      </gw-card>
    `;
  }

  #renderOtherControls() {
    return html`
      <gw-card level="2" heading="More controls">
        <ul class="links">
          ${otherControls}
        </ul>
      </gw-card>
    `;
  }

  #renderContent(): TemplateResult {
    const problem = this.#inputProblem();
    const noInput = problem !== null;
    const modules = this.#modules.value;
    const mac = modules.system?.platform === "darwin";

    return html`
      ${this.#renderInputAlert(problem)}
      <div class="panels">
        ${this.#renderTrackpad(noInput)} ${this.#renderKeyboard(noInput)}
        ${this.#renderShortcuts(noInput, mac)}
        ${this.#renderDesktop(modules.desktop)} ${this.#renderClipboard()}
        <page-open embedded></page-open>
        ${this.#renderCommands()} ${this.#renderOtherControls()}
      </div>
    `;
  }

  override render() {
    return html`
      <div class="page">
        ${this.renderHeader({
          heading: "Remote",
          description: "Control this computer from here",
          icon: mdiRemote,
        })}
        ${this.gate(() => this.#renderContent(), placeholder)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-remote": PageRemote;
  }
}
