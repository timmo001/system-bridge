import { mdiMonitor, mdiPlus } from "@mdi/js";
import "@timmo001/groundwork-ui/define/gw-menu-button.ts";
import type { MenuItem } from "@timmo001/groundwork-ui/gw-menu-button.ts";
import type { Mobile } from "@timmo001/groundwork-mobile/view";
import { Schema } from "effect";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";

/** A paired computer, as the Android app lists them, never with its token. */
const Computers = Schema.Array(
  Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    url: Schema.String,
    current: Schema.Boolean,
  }),
);

const ADD = "add";

/**
 * The connection chip inside the Android app: a menu of the computers the
 * app has paired, to switch between them or add another.
 */
@customElement("sb-computer-menu")
export class SbComputerMenu extends LitElement {
  /** The shell connection, which answers the app's own requests. */
  @property({ attribute: false }) mobile: Mobile | undefined;

  /** What the chip says, such as the host or "Connecting". */
  @property() label = "";

  @state() private items: readonly MenuItem[] = [];

  override connectedCallback(): void {
    super.connectedCallback();
    void this.mobile?.call("servers", Computers).then((computers) => {
      this.items = computers.map((computer) => ({
        value: computer.id,
        label: computer.name,
        description: computer.url,
        icon: mdiMonitor,
        checked: computer.current,
      }));
    });
  }

  #onSelect = (event: CustomEvent<{ readonly value: string }>) => {
    const { value } = event.detail;

    // The app opens the chosen computer's page, or its pairing page
    void (value === ADD
      ? this.mobile?.call("showPairing", Schema.Boolean)
      : this.mobile?.call("selectServer", Schema.Boolean, { id: value }));
  };

  override render() {
    return html`
      <gw-menu-button
        size="small"
        appearance="plain"
        heading="Computer"
        label=${this.label}
        icon=${mdiMonitor}
        labels="auto"
        .items=${this.items}
        .actions=${[{ value: ADD, label: "Add a computer", icon: mdiPlus }]}
        @select=${this.#onSelect}
      ></gw-menu-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-computer-menu": SbComputerMenu;
  }
}
