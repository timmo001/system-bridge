import { mdiBluetooth, mdiBluetoothOff } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import "./sb-segmented";
import { shared } from "./shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import { actionResult, registry, setBluetoothPower } from "~/lib/atoms";

const powerOptions = [
  { value: "on", label: "On", icon: mdiBluetooth },
  { value: "off", label: "Off", icon: mdiBluetoothOff },
] as const;

/** Turns the Bluetooth adapter on or off. */
@customElement("sb-bluetooth-power")
export class SbBluetoothPower extends LitElement {
  static override styles = [
    shared,
    css`
      :host {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: var(--sb-space-1);
      }
    `,
  ];

  @property({ type: Boolean }) powered = false;

  readonly #control = new AtomController(this, () => setBluetoothPower);

  #onPower = (event: CustomEvent<{ readonly value: string }>) => {
    registry.set(setBluetoothPower, event.detail.value === "on");
  };

  override render() {
    const result = actionResult(this.#control.value, "");

    return html`
      <sb-segmented
        label="Bluetooth"
        .options=${powerOptions}
        .value=${this.powered ? "on" : "off"}
        @value-changed=${this.#onPower}
      ></sb-segmented>
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
    "sb-bluetooth-power": SbBluetoothPower;
  }
}
