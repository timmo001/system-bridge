import { mdiBluetooth, mdiBluetoothOff } from "@mdi/js";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

import "@timmo001/groundwork-ui/gw-segmented.ts";
import { selectValue } from "~/lib/select";
import { shared } from "./shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import { registry, setBluetoothPower } from "~/lib/atoms";

const powerOptions = [
  { value: "on", label: "On", icon: mdiBluetooth },
  { value: "off", label: "Off", icon: mdiBluetoothOff },
] as const;

/** Turns the Bluetooth adapter on or off. Failures show in `sb-action-alert`. */
@customElement("sb-bluetooth-power")
export class SbBluetoothPower extends LitElement {
  static override styles = [shared];

  @property({ type: Boolean }) powered = false;

  // Keeps the action alive while it runs
  readonly _control = new AtomController(this, () => setBluetoothPower);

  #onPower = (event: Event) => {
    registry.set(setBluetoothPower, selectValue(event) === "on");
  };

  override render() {
    return html`
      <gw-segmented
        label="Bluetooth"
        size="small"
        .options=${powerOptions}
        .value=${this.powered ? "on" : "off"}
        @change=${this.#onPower}
      ></gw-segmented>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-bluetooth-power": SbBluetoothPower;
  }
}
