import { mdiAlertCircleOutline } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import { icon, shared } from "./shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import { bluetoothFailures } from "~/lib/atoms";

/** Why the Bluetooth actions taken on the page failed, if any did. */
@customElement("sb-bluetooth-alert")
export class SbBluetoothAlert extends LitElement {
  static override styles = [
    shared,
    css`
      /* Takes no room in the dashboard's grid until there's something to say */
      :host {
        display: contents;
      }

      .alert {
        grid-column: 1 / -1;
      }
    `,
  ];

  /** The addresses of the devices listed, whose actions to report. */
  @property({ attribute: false }) addresses: readonly string[] = [];

  readonly #failures = new AtomController(this, () =>
    bluetoothFailures(this.addresses.join("\n")),
  );

  override render() {
    const failures = this.#failures.value;

    if (failures.length === 0) return nothing;

    const messages = failures.map((message) => html`<div>${message}</div>`);

    return html`
      <div class="alert danger" role="alert">
        ${icon(mdiAlertCircleOutline)}
        <div>
          <strong>That didn't work</strong>
          ${messages}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-bluetooth-alert": SbBluetoothAlert;
  }
}
