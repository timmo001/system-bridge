import { mdiCheckCircleOutline, mdiVolumeHigh, mdiVolumeOff } from "@mdi/js";
import type { AudioDevice } from "@timmo001/effect-system-bridge";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { live } from "lit/directives/live.js";

import "./sb-range";
import { icon, shared } from "./shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import { actionResult, audioControl, registry } from "~/lib/atoms";
import { formatPercent } from "~/lib/format";

/**
 * An audio device's name with its volume slider, mute button and a button to
 * make it the default.
 */
@customElement("sb-audio-device")
export class SbAudioDevice extends LitElement {
  static override styles = [
    shared,
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--sb-space-2);
      }

      .heading {
        display: flex;
        align-items: center;
        gap: var(--sb-space-2);
      }

      .heading .name {
        flex: 1;
        min-width: 0;
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

  @property({ attribute: false }) device: AudioDevice | null = null;

  readonly #control = new AtomController(this, () =>
    audioControl(this.device?.id ?? ""),
  );

  /** Sends once let go, not on every step. */
  #onVolume = (event: Event) => {
    if (!(event.currentTarget instanceof HTMLInputElement) || !this.device) {
      return;
    }

    registry.set(audioControl(this.device.id), {
      volume: event.currentTarget.valueAsNumber,
    });
  };

  #onMute = () => {
    if (!this.device) return;

    registry.set(audioControl(this.device.id), {
      muted: this.device.muted !== true,
    });
  };

  #onDefault = () => {
    if (!this.device) return;

    registry.set(audioControl(this.device.id), { default: true });
  };

  override render() {
    const device = this.device;

    if (!device) return nothing;

    const waiting = this.#control.value.waiting;

    const result = actionResult(this.#control.value, "");

    const id = `volume-${device.id}`;

    return html`
      <div class="heading">
        <span class="name truncate" title=${device.id}>${device.name}</span>
        ${
          device.default
            ? html`<span class="chip accent">Default</span>`
            : html`<button
                class="button plain small"
                type="button"
                ?disabled=${waiting}
                @click=${this.#onDefault}
              >
                ${icon(mdiCheckCircleOutline)} Make default
              </button>`
        }
      </div>
      <div class="level">
        ${
          device.muted === null
            ? nothing
            : html`<button
                class="button icon-only plain small"
                type="button"
                aria-pressed=${device.muted ? "true" : "false"}
                aria-label="Mute ${device.name}"
                title=${device.muted ? `Unmute ${device.name}` : `Mute ${device.name}`}
                ?disabled=${waiting}
                @click=${this.#onMute}
              >
                ${icon(device.muted ? mdiVolumeOff : mdiVolumeHigh)}
              </button>`
        }
        ${
          device.volume === null
            ? nothing
            : html`<sb-range>
                  <input
                    class="range"
                    type="range"
                    id=${id}
                    min="0"
                    max="100"
                    step="1"
                    aria-label="Volume for ${device.name}"
                    aria-valuetext=${formatPercent(device.volume)}
                    .value=${live(String(Math.round(device.volume)))}
                    ?disabled=${waiting}
                    @change=${this.#onVolume}
                  />
                </sb-range>
                <output class="muted small tabular" for=${id}
                  >${device.muted ? "Muted" : formatPercent(device.volume)}</output
                >`
        }
      </div>
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
    "sb-audio-device": SbAudioDevice;
  }
}
