import {
  mdiClose,
  mdiCursorDefaultClickOutline,
  mdiDotsHorizontal,
  mdiSkullOutline,
} from "@mdi/js";
import type {
  DesktopCompositor,
  DesktopWindow,
  DesktopWorkspace,
  HyprlandWindow,
} from "@timmo001/effect-system-bridge";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import "./sb-menu-button";
import type { MenuItem } from "./sb-menu-button";
import { shared } from "./shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import {
  actionResult,
  registry,
  type WindowAction,
  windowAction,
} from "~/lib/atoms";

/** The window states each desktop can set. */
const settableStates = new Map<DesktopCompositor, readonly string[]>([
  ["hyprland", ["fullscreen", "maximised"]],
  ["wayland", ["fullscreen", "maximised", "minimised"]],
  ["windows", ["maximised", "minimised"]],
]);

const stateLabels = new Map([
  ["fullscreen", "Fullscreen"],
  ["maximised", "Maximised"],
  ["minimised", "Minimised"],
]);

/**
 * A menu of a window's actions: focus or close it, change its state and, on
 * Hyprland, kill, float, pin or move it.
 */
@customElement("sb-window-actions")
export class SbWindowActions extends LitElement {
  static override styles = [
    shared,
    css`
      :host {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: var(--sb-space-1);
      }
    `,
  ];

  @property({ attribute: false }) window: DesktopWindow | null = null;

  /** What only Hyprland reports about the window. */
  @property({ attribute: false }) extra: HyprlandWindow | undefined = undefined;

  @property({ attribute: false }) compositor: DesktopCompositor = "wayland";

  /** Where the window can be moved to, on Hyprland. */
  @property({ attribute: false }) workspaces: readonly DesktopWorkspace[] = [];

  readonly #action = new AtomController(this, () =>
    windowAction(this.window?.id ?? ""),
  );

  #run(action: WindowAction) {
    if (this.window) registry.set(windowAction(this.window.id), action);
  }

  #onToggle = (
    event: CustomEvent<{ readonly value: string; readonly checked: boolean }>,
  ) => {
    const { value, checked } = event.detail;

    switch (value) {
      case "floating":
      case "pinned":
        this.#run({ _tag: "set", settings: { [value]: checked } });
        break;
      case "fullscreen":
      case "maximised":
      case "minimised":
        this.#run({ _tag: "state", state: { [value]: checked } });
        break;
    }
  };

  #onSelect = (event: CustomEvent<{ readonly value: string }>) => {
    const value = event.detail.value;

    switch (value) {
      case "close":
        this.#run({ _tag: "close" });
        break;
      case "focus":
        this.#run({ _tag: "focus" });
        break;
      case "kill":
        this.#run({ _tag: "kill" });
        break;
      default:
        this.#run({
          _tag: "move",
          workspace: value.replace(/^workspace:/, ""),
        });
    }
  };

  #items(window: DesktopWindow): MenuItem[] {
    const actions: MenuItem[] = [
      {
        value: "focus",
        label: "Focus",
        icon: mdiCursorDefaultClickOutline,
        disabled: window.focused,
      },
      { value: "close", label: "Close", icon: mdiClose },
    ];

    const states = (settableStates.get(this.compositor) ?? []).map(
      (state): MenuItem => ({
        value: state,
        label: stateLabels.get(state) ?? state,
        kind: "checkbox",
        checked:
          state === "fullscreen"
            ? window.fullscreen === true
            : state === "maximised"
              ? window.maximised === true ||
                this.extra?.fullscreen_mode === "maximised"
              : window.minimised === true,
      }),
    );

    if (this.compositor !== "hyprland") return [...actions, ...states];

    actions.push({
      value: "kill",
      label: "Kill",
      description: "Ends its app without asking",
      icon: mdiSkullOutline,
    });

    const settings: MenuItem[] = [
      {
        value: "floating",
        label: "Floating",
        kind: "checkbox",
        checked: window.floating === true,
      },
      {
        value: "pinned",
        label: "Pinned",
        description: "Shown on every workspace",
        kind: "checkbox",
        checked: this.extra?.pinned === true,
        disabled: window.floating !== true,
      },
    ];

    const moves = this.workspaces.flatMap((workspace): MenuItem[] =>
      workspace.id === window.workspace
        ? []
        : [
            {
              value: `workspace:${workspace.id}`,
              label: workspace.name ?? workspace.id,
              group: "Move to",
            },
          ],
    );

    return [...actions, ...states, ...settings, ...moves];
  }

  override render() {
    const window = this.window;

    if (!window) return nothing;

    const value = this.#action.value;

    const result = actionResult(value, "");

    const name = window.app ?? window.title ?? "window";

    return html`
      <sb-menu-button
        icon-only
        label="Actions for ${name}"
        .icon=${mdiDotsHorizontal}
        .busy=${value.waiting}
        .items=${this.#items(window)}
        @menu-toggle=${this.#onToggle}
        @menu-select=${this.#onSelect}
      ></sb-menu-button>
      ${
        result?.success === false
          ? html`<span class="error-text" role="alert">${result.message}</span>`
          : nothing
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-window-actions": SbWindowActions;
  }
}
