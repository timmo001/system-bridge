import { mdiCheckCircleOutline, mdiVolumeHigh, mdiVolumeOff } from "@mdi/js";
import type { AudioApp, AudioDevice } from "@timmo001/effect-system-bridge";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { live } from "lit/directives/live.js";

import "@timmo001/groundwork-ui/gw-button.ts";
import "@timmo001/groundwork-ui/gw-range.ts";
import { rangeTarget } from "~/lib/select";
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
        gap: var(--gw-space-2);
      }

      .heading {
        display: flex;
        align-items: center;
        gap: var(--gw-space-2);
      }

      .heading .name {
        flex: 1;
        min-width: 0;
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

    const range = rangeTarget(event);

    if (range === null || !target) return;

    registry.set(audioControl(target.id), { volume: range.value });
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
      ${this.app.playing ? nothing : html`<gw-chip size="small">Paused</gw-chip>`}`;
    }

    if (this.device?.default) {
      return html`<gw-chip size="small" tone="accent">Default</gw-chip>`;
    }

    return html`<gw-button
      variant="neutral"
      appearance="plain"
      size="small"
      icon=${mdiCheckCircleOutline}
      ?loading=${this.#control.value.waiting}
      @click=${this.#onDefault}
      >Make default</gw-button
    >`;
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
            : html`<gw-range
                  id=${id}
                  label="Volume for ${target.name}"
                  label-hidden
                  unit="%"
                  .value=${live(Math.round(target.volume))}
                  ?disabled=${waiting}
                  @change=${this.#onVolume}
                ></gw-range>
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
