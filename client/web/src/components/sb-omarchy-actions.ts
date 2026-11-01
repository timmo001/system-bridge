import {
  mdiDotsHorizontal,
  mdiEyeOffOutline,
  mdiEyeOutline,
  mdiToggleSwitchOutline,
} from "@mdi/js";
import {
  OmarchyAction,
  type OmarchyMenu,
  type OmarchyPanel,
} from "@timmo001/effect-system-bridge";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import "@timmo001/groundwork-ui/gw-menu-button.ts";
import type { MenuItem } from "@timmo001/groundwork-ui/gw-menu-button.ts";
import { shared } from "./shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import { omarchyMenu, omarchyPanel, registry } from "~/lib/atoms";
import { menuValue } from "~/lib/select";

/**
 * A menu to open, close or toggle an Omarchy shell panel, or the Omarchy menu
 * at a route. Failures show in `sb-action-alert`.
 */
@customElement("sb-omarchy-actions")
export class SbOmarchyActions extends LitElement {
  static override styles = [
    shared,
    css`
      :host {
        display: flex;
      }
    `,
  ];

  /** Whether `item` is a menu route or a panel. */
  @property() kind: "menu" | "panel" = "panel";

  @property({ attribute: false }) item: OmarchyMenu | OmarchyPanel | null =
    null;

  readonly #action = new AtomController(this, () => this.#atom());

  #atom() {
    const id = this.item?.id ?? "";

    return this.kind === "menu" ? omarchyMenu(id) : omarchyPanel(id);
  }

  #onSelect = (event: Event) => {
    const value = menuValue(event);

    const action = OmarchyAction.literals.find((literal) => literal === value);

    if (action) registry.set(this.#atom(), action);
  };

  // Closing the menu closes whichever route is open, so it's on the card
  #items(): MenuItem[] {
    return [
      { value: "open", label: "Open", icon: mdiEyeOutline },
      ...(this.kind === "menu"
        ? []
        : [{ value: "close", label: "Close", icon: mdiEyeOffOutline }]),
      { value: "toggle", label: "Toggle", icon: mdiToggleSwitchOutline },
    ];
  }

  override render() {
    const item = this.item;

    if (!item) return nothing;

    return html`
      <gw-menu-button
        labels="hide"
        appearance="plain"
        size="small"
        label="Actions for ${item.name}"
        .icon=${mdiDotsHorizontal}
        ?loading=${this.#action.value.waiting}
        .items=${this.#items()}
        @select=${this.#onSelect}
      ></gw-menu-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-omarchy-actions": SbOmarchyActions;
  }
}
