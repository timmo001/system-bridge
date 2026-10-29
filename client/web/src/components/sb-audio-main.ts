import {
  mdiMicrophone,
  mdiMicrophoneOff,
  mdiSpeaker,
  mdiVolumeHigh,
  mdiVolumeOff,
} from "@mdi/js";
import type { AudioDevice } from "@timmo001/effect-system-bridge";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { live } from "lit/directives/live.js";

import "./sb-card";
import "./sb-range";
import "./sb-select";
import type { SelectOption } from "./sb-select";
import { icon, shared } from "./shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import { actionResult, audioControl, registry } from "~/lib/atoms";
import { formatPercent } from "~/lib/format";

const kinds = {
  output: {
    label: "Output",
    art: mdiSpeaker,
    unmuted: mdiVolumeHigh,
    muted: mdiVolumeOff,
  },
  input: {
    label: "Input",
    art: mdiMicrophone,
    unmuted: mdiMicrophone,
    muted: mdiMicrophoneOff,
  },
} as const;

/**
 * The default output or input, laid out like the Media page's player: a
 * picker to make another device the default, and its volume and mute.
 */
@customElement("sb-audio-main")
export class SbAudioMain extends LitElement {
  static override styles = [
    shared,
    css`
      :host {
        display: block;
      }

      .main {
        display: grid;
        gap: var(--sb-space-6);
        grid-template-columns: minmax(0, 8rem) minmax(0, 1fr);
        align-items: center;
      }

      @media (max-width: 40rem) {
        .main {
          grid-template-columns: minmax(0, 1fr);
          justify-items: center;
          text-align: center;
        }
      }

      .art {
        display: grid;
        place-items: center;
        width: 100%;
        max-width: 8rem;
        aspect-ratio: 1;
        background: var(--sb-color-sunken);
        border-radius: var(--sb-radius-xl);
        box-shadow: var(--sb-shadow-m);
        color: var(--sb-color-muted);
        --sb-icon-size: 3rem;
      }

      .info {
        display: flex;
        flex-direction: column;
        gap: var(--sb-space-2);
        min-width: 0;
        width: 100%;
      }

      .picker {
        width: 20rem;
        max-width: 100%;
      }

      .title {
        margin: 0;
        font-size: var(--sb-font-size-2xl);
      }

      .level {
        display: flex;
        align-items: center;
        gap: var(--sb-space-3);
        margin-top: var(--sb-space-2);
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

  @property() kind: keyof typeof kinds = "output";

  @property({ attribute: false }) devices: readonly AudioDevice[] = [];

  get #device(): AudioDevice | undefined {
    return this.devices.find((device) => device.default) ?? this.devices[0];
  }

  readonly #control = new AtomController(this, () =>
    audioControl(this.#device?.id ?? ""),
  );

  #onDefault = (event: CustomEvent<{ readonly value: string }>) => {
    registry.set(audioControl(event.detail.value), { default: true });
  };

  /** Sends once let go, not on every step. */
  #onVolume = (event: Event) => {
    const device = this.#device;

    if (!(event.currentTarget instanceof HTMLInputElement) || !device) return;

    registry.set(audioControl(device.id), {
      volume: event.currentTarget.valueAsNumber,
    });
  };

  #onMute = () => {
    const device = this.#device;

    if (!device) return;

    registry.set(audioControl(device.id), { muted: device.muted !== true });
  };

  #renderPicker(device: AudioDevice) {
    const kind = kinds[this.kind].label.toLowerCase();
    const others = this.devices.length > 1;

    // With nothing else to pick, it says so rather than offering one choice
    const options: readonly SelectOption[] = others
      ? this.devices.map((option) => ({ value: option.id, label: option.name }))
      : [{ value: device.id, label: `No other ${kind}s` }];

    return html`<sb-select
      class="picker"
      label="Default ${kind}"
      search-placeholder="Search devices"
      .options=${options}
      .value=${device.id}
      ?disabled=${!others}
      @value-changed=${this.#onDefault}
    ></sb-select>`;
  }

  override render() {
    const device = this.#device;

    if (!device) return nothing;

    const kind = kinds[this.kind];
    const waiting = this.#control.value.waiting;
    const result = actionResult(this.#control.value, "");

    return html`<sb-card>
      <div class="main" role="region" aria-label=${kind.label}>
        <div class="art" aria-hidden="true">${icon(kind.art)}</div>
        <div class="info">
          ${this.#renderPicker(device)}
          <h2 class="title truncate" title=${device.id}>${device.name}</h2>
          <div class="level">
            ${
              device.muted === null
                ? nothing
                : html`<button
                    class="button round icon-only large ${device.muted ? "plain" : "filled"}"
                    type="button"
                    aria-pressed=${device.muted ? "true" : "false"}
                    aria-label="Mute ${device.name}"
                    title=${device.muted ? `Unmute ${device.name}` : `Mute ${device.name}`}
                    ?disabled=${waiting}
                    @click=${this.#onMute}
                  >
                    ${icon(device.muted ? kind.muted : kind.unmuted)}
                  </button>`
            }
            ${
              device.volume === null
                ? nothing
                : html`<sb-range>
                      <input
                        class="range"
                        type="range"
                        id="volume"
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
                    <output class="muted small tabular" for="volume"
                      >${device.muted ? "Muted" : formatPercent(device.volume)}</output
                    >`
            }
          </div>
          ${
            result?.success === false
              ? html`<span class="error-text" role="alert"
                  >${result.message}</span
                >`
              : nothing
          }
        </div>
      </div>
    </sb-card>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-audio-main": SbAudioMain;
  }
}
