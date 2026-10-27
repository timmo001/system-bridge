import { mdiCheckCircleOutline, mdiVolumeHigh, mdiVolumeOff } from "@mdi/js";
import type { AudioApp, AudioDevice } from "@timmo001/effect-system-bridge";
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
 * make it the default. Given an app instead, it shows what the app is playing
 * and where, in place of the default button.
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

  /** An app playing sound, shown instead of a device. */
  @property({ attribute: false }) app: AudioApp | null = null;

  /** The name of the output the app plays to. */
  @property({ attribute: false }) outputName: string | null = null;

  get #target(): AudioDevice | AudioApp | null {
    return this.device ?? this.app;
  }

  readonly #control = new AtomController(this, () =>
    audioControl(this.#target?.id ?? ""),
  );

  /** Sends once let go, not on every step. */
  #onVolume = (event: Event) => {
    const target = this.#target;

    if (!(event.currentTarget instanceof HTMLInputElement) || !target) {
      return;
    }

    registry.set(audioControl(target.id), {
      volume: event.currentTarget.valueAsNumber,
    });
  };

  #onMute = () => {
    const target = this.#target;

    if (!target) return;

    registry.set(audioControl(target.id), { muted: target.muted !== true });
  };

  #onDefault = () => {
    if (!this.device) return;

    registry.set(audioControl(this.device.id), { default: true });
  };

  #renderAside() {
    if (this.app) {
      const about = [this.app.title, this.outputName]
        .filter(Boolean)
        .join(" · ");

      return html`${
        about
          ? html`<span class="muted small truncate">${about}</span>`
          : nothing
      }
      ${this.app.playing ? nothing : html`<span class="chip">Paused</span>`}`;
    }

    if (this.device?.default) {
      return html`<span class="chip accent">Default</span>`;
    }

    return html`<button
      class="button plain small"
      type="button"
      ?disabled=${this.#control.value.waiting}
      @click=${this.#onDefault}
    >
      ${icon(mdiCheckCircleOutline)} Make default
    </button>`;
  }

  override render() {
    const target = this.#target;

    if (!target) return nothing;

    const waiting = this.#control.value.waiting;

    const result = actionResult(this.#control.value, "");

    const id = `volume-${target.id}`;

    return html`
      <div class="heading">
        <span class="name truncate" title=${target.id}>${target.name}</span>
        ${this.#renderAside()}
      </div>
      <div class="level">
        ${
          target.muted === null
            ? nothing
            : html`<button
                class="button icon-only plain small"
                type="button"
                aria-pressed=${target.muted ? "true" : "false"}
                aria-label="Mute ${target.name}"
                title=${target.muted ? `Unmute ${target.name}` : `Mute ${target.name}`}
                ?disabled=${waiting}
                @click=${this.#onMute}
              >
                ${icon(target.muted ? mdiVolumeOff : mdiVolumeHigh)}
              </button>`
        }
        ${
          target.volume === null
            ? nothing
            : html`<sb-range>
                  <input
                    class="range"
                    type="range"
                    id=${id}
                    min="0"
                    max="100"
                    step="1"
                    aria-label="Volume for ${target.name}"
                    aria-valuetext=${formatPercent(target.volume)}
                    .value=${live(String(Math.round(target.volume)))}
                    ?disabled=${waiting}
                    @change=${this.#onVolume}
                  />
                </sb-range>
                <output class="muted small tabular" for=${id}
                  >${target.muted ? "Muted" : formatPercent(target.volume)}</output
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
