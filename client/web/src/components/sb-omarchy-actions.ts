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

import "./sb-menu-button";
import type { MenuItem } from "./sb-menu-button";
import { shared } from "./shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import { omarchyMenu, omarchyPanel, registry } from "~/lib/atoms";

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

  #onSelect = (event: CustomEvent<{ readonly value: string }>) => {
    const action = OmarchyAction.literals.find(
      (literal) => literal === event.detail.value,
    );

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
      <sb-menu-button
        icon-only
        label="Actions for ${item.name}"
        .icon=${mdiDotsHorizontal}
        .busy=${this.#action.value.waiting}
        .items=${this.#items()}
        @menu-select=${this.#onSelect}
      ></sb-menu-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-omarchy-actions": SbOmarchyActions;
  }
}
