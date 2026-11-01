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

import "@timmo001/groundwork-ui/gw-card.ts";
import "@timmo001/groundwork-ui/gw-range.ts";
import "@timmo001/groundwork-ui/gw-select.ts";
import type { OptionItem } from "@timmo001/groundwork-ui/gw-option-list.ts";
import { rangeTarget, selectValue } from "~/lib/select";
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

      /* Fills the host when a grid stretches it beside another card */
      gw-card {
        height: 100%;
      }

      .main {
        display: grid;
        gap: var(--gw-space-6);
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
        background: var(--gw-color-surface-lower);
        border-radius: var(--gw-radius-xl);
        box-shadow: var(--gw-shadow-m);
        color: var(--gw-color-text-secondary);
        --sb-icon-size: 3rem;
      }

      .info {
        display: flex;
        flex-direction: column;
        gap: var(--gw-space-2);
        min-width: 0;
        width: 100%;
      }

      .picker {
        width: 20rem;
        max-width: 100%;
      }

      .title {
        margin: 0;
        font-size: var(--gw-font-size-2xl);
      }

      .level {
        display: flex;
        align-items: center;
        gap: var(--gw-space-3);
        margin-top: var(--gw-space-2);
      }

      gw-range {
        flex: 1;
      }

      .level output {
        min-width: 5ch;
        white-space: nowrap;
        text-align: end;
      }

      /* Beside another card: smaller art, and the picker names the device */
      :host([compact]) .main {
        gap: var(--gw-space-4);
        grid-template-columns: 5rem minmax(0, 1fr);
        justify-items: stretch;
        text-align: start;
      }

      :host([compact]) .art {
        border-radius: var(--gw-radius-m);
        box-shadow: none;
        --sb-icon-size: 2rem;
      }

      :host([compact]) .title {
        display: none;
      }

      :host([compact]) .level {
        margin-top: 0;
      }

      :host([compact]) .button.large {
        width: 2.5rem;
        --sb-icon-size: 1.25rem;
      }
    `,
  ];

  @property() kind: keyof typeof kinds = "output";

  @property({ attribute: false }) devices: readonly AudioDevice[] = [];

  /** The card's heading and link, for when it stands in for the Audio page. */
  @property() heading = "";

  @property() href = "";

  @property({ type: Boolean, reflect: true }) compact = false;

  get #device(): AudioDevice | undefined {
    return this.devices.find((device) => device.default) ?? this.devices[0];
  }

  readonly #control = new AtomController(this, () =>
    audioControl(this.#device?.id ?? ""),
  );

  #onDefault = (event: Event) => {
    registry.set(audioControl(selectValue(event)), { default: true });
  };

  /** Sends once let go, not on every step. */
  #onVolume = (event: Event) => {
    const device = this.#device;

    const range = rangeTarget(event);

    if (range === null || !device) return;

    registry.set(audioControl(device.id), { volume: range.value });
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
    const options: readonly OptionItem[] = others
      ? this.devices.map((option) => ({ value: option.id, label: option.name }))
      : [{ value: device.id, label: `No other ${kind}s` }];

    return html`<gw-select
      class="picker"
      label="Default ${kind}"
      label-hidden
      .options=${options}
      .value=${device.id}
      ?disabled=${!others}
      @change=${this.#onDefault}
    ></gw-select>`;
  }

  override render() {
    const device = this.#device;

    if (!device) return nothing;

    const kind = kinds[this.kind];
    const waiting = this.#control.value.waiting;
    const result = actionResult(this.#control.value, "");

    return html`<gw-card heading=${this.href === "" ? this.heading : ""}>
      ${
        this.href === ""
          ? nothing
          : html`<a slot="heading" href=${this.href}>${this.heading}</a>`
      }
      <div class="main" role="region" aria-label=${kind.label}>
        <div class="art" aria-hidden="true">${icon(kind.art)}</div>
        <div class="info">
          ${this.#renderPicker(device)}
          <h2 class="title truncate" title=${device.id}>${device.name}</h2>
          <div class="level">
            ${
              device.muted === null
                ? nothing
                : html`<gw-button
                    variant=${device.muted ? "danger" : "brand"}
                    appearance=${device.muted ? "filled" : "accent"}
                    size="large"
                    labels="hide"
                    toggle
                    ?pressed=${device.muted}
                    icon=${device.muted ? kind.muted : kind.unmuted}
                    ?disabled=${waiting}
                    @click=${this.#onMute}
                    >Mute ${device.name}</gw-button
                  >`
            }
            ${
              device.volume === null
                ? nothing
                : html`<gw-range
                      id="volume"
                      label="Volume for ${device.name}"
                      label-hidden
                      unit="%"
                      .value=${live(Math.round(device.volume))}
                      ?disabled=${waiting}
                      @change=${this.#onVolume}
                    ></gw-range>
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
    </gw-card>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-audio-main": SbAudioMain;
  }
}
