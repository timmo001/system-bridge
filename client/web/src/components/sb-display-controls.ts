import { mdiMonitor, mdiMonitorOff } from "@mdi/js";
import type { Display } from "@timmo001/effect-system-bridge";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { live } from "lit/directives/live.js";

import "./sb-range";
import "./sb-segmented";
import { shared } from "./shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import { actionResult, displayControl, registry } from "~/lib/atoms";
import { formatPercent } from "~/lib/format";

const powerOptions = [
  { value: "on", label: "On", icon: mdiMonitor },
  { value: "off", label: "Off", icon: mdiMonitorOff },
] as const;

/** A display's brightness slider and power switch, for what it supports. */
@customElement("sb-display-controls")
export class SbDisplayControls extends LitElement {
  static override styles = [
    shared,
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--sb-space-3);
      }

      .level {
        display: flex;
        align-items: center;
        gap: var(--sb-space-3);
      }

      .range {
        width: 100%;
        margin: 0;
        accent-color: var(--sb-color-accent);
      }

      .level output {
        min-width: 5ch;
        white-space: nowrap;
        text-align: end;
      }
    `,
  ];

  @property({ attribute: false }) display: Display | null = null;

  readonly #control = new AtomController(this, () =>
    displayControl(this.display?.id ?? ""),
  );

  /** Sends once let go, not on every step. */
  #onBrightness = (event: Event) => {
    if (!(event.currentTarget instanceof HTMLInputElement) || !this.display) {
      return;
    }

    registry.set(displayControl(this.display.id), {
      brightness: event.currentTarget.valueAsNumber,
    });
  };

  #onPower = (event: CustomEvent<{ readonly value: string }>) => {
    if (!this.display) return;

    const power_state = event.detail.value;

    if (power_state !== "on" && power_state !== "off") return;

    registry.set(displayControl(this.display.id), { power_state });
  };

  override render() {
    const display = this.display;

    if (!display) return nothing;

    const result = actionResult(this.#control.value, "");
    const id = `brightness-${display.id}`;

    return html`
      ${
        display.brightness === null
          ? nothing
          : html`<div class="level">
              <sb-range>
                <input
                  class="range"
                  type="range"
                  id=${id}
                  min="0"
                  max="100"
                  step="1"
                  aria-label="Brightness"
                  aria-valuetext=${formatPercent(display.brightness)}
                  .value=${live(String(Math.round(display.brightness)))}
                  ?disabled=${this.#control.value.waiting}
                  @change=${this.#onBrightness}
                />
              </sb-range>
              <output class="muted small tabular" for=${id}
                >${formatPercent(display.brightness)}</output
              >
            </div>`
      }
      ${
        display.power_state === null
          ? nothing
          : html`<sb-segmented
              label="Power"
              .options=${powerOptions}
              .value=${display.power_state === "on" ? "on" : "off"}
              @value-changed=${this.#onPower}
            ></sb-segmented>`
      }
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
    "sb-display-controls": SbDisplayControls;
  }
}
