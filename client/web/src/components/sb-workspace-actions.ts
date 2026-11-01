import { mdiDotsHorizontal, mdiEyeOutline, mdiRenameOutline } from "@mdi/js";
import type {
  DesktopCompositor,
  DesktopWorkspace,
} from "@timmo001/effect-system-bridge";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";

import "@timmo001/groundwork-ui/gw-menu-button.ts";
import type { MenuItem } from "@timmo001/groundwork-ui/gw-menu-button.ts";
import { shared } from "./shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import {
  actionResult,
  focusWorkspace,
  registry,
  workspaceAction,
} from "~/lib/atoms";
import { menuValue } from "~/lib/select";

/**
 * A menu of a workspace's actions: show it and, on Hyprland, rename it or move
 * it to another display.
 */
@customElement("sb-workspace-actions")
export class SbWorkspaceActions extends LitElement {
  static override styles = [
    shared,
    css`
      :host {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: var(--sb-space-1);
      }

      form {
        display: flex;
        align-items: center;
        gap: var(--sb-space-1);
      }

      .input {
        width: 12rem;
      }
    `,
  ];

  @property({ attribute: false }) workspace: DesktopWorkspace | null = null;

  @property({ attribute: false }) compositor: DesktopCompositor = "wayland";

  /** The displays a workspace can be moved to, on Hyprland. */
  @property({ attribute: false }) displays: readonly string[] = [];

  @state() private renaming = false;

  @query("input") private input?: HTMLInputElement;

  readonly #action = new AtomController(this, () =>
    workspaceAction(this.workspace?.id ?? ""),
  );

  readonly #focus = new AtomController(this, () =>
    focusWorkspace(this.workspace?.id ?? ""),
  );

  #onSelect = (event: Event) => {
    if (!this.workspace) return;

    const value = menuValue(event);

    if (value === "show") {
      registry.set(focusWorkspace(this.workspace.id), undefined);
    } else if (value === "rename") {
      this.renaming = true;
    } else {
      registry.set(workspaceAction(this.workspace.id), {
        _tag: "move",
        display: value.replace(/^display:/, ""),
      });
    }
  };

  #onRename = (event: SubmitEvent) => {
    event.preventDefault();

    if (!this.workspace || !(event.currentTarget instanceof HTMLFormElement)) {
      return;
    }

    const input = event.currentTarget.elements.namedItem("name");

    if (!(input instanceof HTMLInputElement)) return;

    registry.set(workspaceAction(this.workspace.id), {
      _tag: "rename",
      name: input.value.trim(),
    });
    this.renaming = false;
  };

  #onCancel = () => {
    this.renaming = false;
  };

  override updated(changedProperties: PropertyValues) {
    if (changedProperties.has("renaming") && this.renaming) {
      this.input?.select();
    }
  }

  #items(workspace: DesktopWorkspace): MenuItem[] {
    // Windows can't switch workspaces for you
    const show: MenuItem[] =
      this.compositor === "windows"
        ? []
        : [
            {
              value: "show",
              label: "Show",
              icon: mdiEyeOutline,
              disabled: workspace.focused,
            },
          ];

    if (this.compositor !== "hyprland") return show;

    const moves = this.displays.flatMap((display): MenuItem[] =>
      display === workspace.display
        ? []
        : [{ value: `display:${display}`, label: display, group: "Move to" }],
    );

    return [
      ...show,
      { value: "rename", label: "Rename", icon: mdiRenameOutline },
      ...moves,
    ];
  }

  override render() {
    const workspace = this.workspace;

    if (!workspace) return nothing;

    const name = workspace.name ?? workspace.id;

    if (this.renaming) {
      return html`<form @submit=${this.#onRename}>
        <input
          class="input"
          name="name"
          aria-label="New name for ${name}"
          placeholder=${workspace.id}
          .value=${name}
        />
        <button class="button tonal small" type="submit">Rename</button>
        <button
          class="button plain small"
          type="button"
          @click=${this.#onCancel}
        >
          Cancel
        </button>
      </form>`;
    }

    const items = this.#items(workspace);

    if (items.length === 0) return nothing;

    const failure = [
      actionResult(this.#action.value, ""),
      actionResult(this.#focus.value, ""),
    ].flatMap((result) =>
      result?.success === false ? [result.message] : [],
    )[0];

    return html`
      <gw-menu-button
        labels="hide"
        appearance="plain"
        size="small"
        label="Actions for ${name}"
        .icon=${mdiDotsHorizontal}
        ?loading=${this.#action.value.waiting || this.#focus.value.waiting}
        .items=${items}
        @select=${this.#onSelect}
      ></gw-menu-button>
      ${
        failure === undefined
          ? nothing
          : html`<span class="error-text" role="alert">${failure}</span>`
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-workspace-actions": SbWorkspaceActions;
  }
}
