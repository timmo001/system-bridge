import { mdiMonitor, mdiMonitorOff } from "@mdi/js";
import type { Display } from "@timmo001/effect-system-bridge";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { live } from "lit/directives/live.js";

import "@timmo001/groundwork-ui/gw-range.ts";
import "@timmo001/groundwork-ui/gw-segmented.ts";
import { rangeTarget, selectValue } from "~/lib/select";
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
        gap: var(--gw-space-3);
      }

      .level {
        display: flex;
        align-items: center;
        gap: var(--gw-space-3);
      }

      gw-range {
        flex: 1;
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
    const range = rangeTarget(event);

    if (range === null || !this.display) return;

    registry.set(displayControl(this.display.id), {
      brightness: range.value,
    });
  };

  #onPower = (event: Event) => {
    if (!this.display) return;

    const power_state = selectValue(event);

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
              <gw-range
                id=${id}
                label="Brightness"
                label-hidden
                unit="%"
                .value=${live(Math.round(display.brightness))}
                ?disabled=${this.#control.value.waiting}
                @change=${this.#onBrightness}
              ></gw-range>
              <output class="muted small tabular" for=${id}
                >${formatPercent(display.brightness)}</output
              >
            </div>`
      }
      ${
        display.power_state === null
          ? nothing
          : html`<gw-segmented
              label="Power"
              size="small"
              .options=${powerOptions}
              .value=${display.power_state === "on" ? "on" : "off"}
              @change=${this.#onPower}
            ></gw-segmented>`
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
