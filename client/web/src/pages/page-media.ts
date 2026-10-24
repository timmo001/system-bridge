import {
  mdiMusicNote,
  mdiPause,
  mdiPlay,
  mdiPlayCircleOutline,
  mdiSkipNext,
  mdiSkipPrevious,
  mdiStop,
  mdiVolumeMinus,
  mdiVolumeOff,
  mdiVolumePlus,
} from "@mdi/js";
import { MediaAction } from "@timmo001/effect-system-bridge";
import { Schema } from "effect";
import { css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";

import "~/components/sb-card";
import "~/components/sb-meter";
import { icon, pageStyles, shared } from "~/components/shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import {
  actionResult,
  latestModuleData,
  mediaControl,
  registry,
} from "~/lib/atoms";
import { formatAgo, formatDuration, formatPercent } from "~/lib/format";

import { SbPage } from "./sb-page";

const isMediaAction = Schema.is(MediaAction);

const actionLabels: Readonly<Record<MediaAction, string>> = {
  PLAY: "Play",
  PAUSE: "Pause",
  STOP: "Stop",
  NEXT: "Next",
  PREVIOUS: "Previous",
  VOLUME_UP: "Volume up",
  VOLUME_DOWN: "Volume down",
  MUTE: "Mute",
};

const placeholder = html`<span
  class="skeleton"
  style="min-height: 22rem; border-radius: var(--sb-radius-l)"
></span>`;

/** What's playing on this system, with controls for it. */
@customElement("page-media")
export class PageMedia extends SbPage {
  static override styles = [
    shared,
    pageStyles,
    css`
      .player {
        display: grid;
        gap: var(--sb-space-6);
        grid-template-columns: minmax(0, 14rem) minmax(0, 1fr);
        align-items: center;
      }

      .info .status {
        align-self: start;
      }

      @media (max-width: 40rem) {
        .player {
          grid-template-columns: minmax(0, 1fr);
          justify-items: center;
          text-align: center;
        }

        .info .status {
          align-self: center;
        }
      }

      .art {
        width: 100%;
        max-width: 14rem;
        aspect-ratio: 1;
        object-fit: cover;
        background: var(--sb-color-sunken);
        border-radius: var(--sb-radius-xl);
        box-shadow: var(--sb-shadow-m);
      }

      div.art {
        display: grid;
        place-items: center;
        color: var(--sb-color-muted);
        --sb-icon-size: 4rem;
      }

      .info {
        display: flex;
        flex-direction: column;
        gap: var(--sb-space-1);
        min-width: 0;
        width: 100%;
      }

      .title {
        font-size: var(--sb-font-size-2xl);
      }

      .controls {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: var(--sb-space-2);
        margin-top: var(--sb-space-4);
      }

      .controls .main {
        width: 3.5rem;
        height: 3.5rem;
        --sb-icon-size: 1.75rem;
      }
    `,
  ];

  readonly #data = new AtomController(this, () => latestModuleData);

  readonly #control = new AtomController(this, () => mediaControl);

  @state() private sent: MediaAction | null = null;

  protected readonly pageTitle = "Media controls";

  #send(action: MediaAction) {
    this.sent = action;
    registry.set(mediaControl, action);
  }

  #onControlClick = (event: MouseEvent) => {
    if (!(event.currentTarget instanceof HTMLButtonElement)) return;

    const action = event.currentTarget.dataset.action;

    if (isMediaAction(action)) this.#send(action);
  };

  #button(
    action: MediaAction,
    path: string,
    options: { readonly disabled?: boolean; readonly main?: boolean } = {},
  ) {
    const pending = this.#control.value.waiting && this.sent === action;

    return html`<button
      class="button round icon-only large ${options.main ? "filled main" : "plain"}"
      type="button"
      aria-label=${actionLabels[action]}
      title=${actionLabels[action]}
      ?disabled=${options.disabled === true || pending}
      data-action=${action}
      @click=${this.#onControlClick}
    >
      ${icon(path)}
    </button>`;
  }

  #renderPlayer() {
    const media = this.#data.value.media;
    const playing = media?.status?.toLowerCase() === "playing";

    const percent =
      media?.position !== null &&
      media?.position !== undefined &&
      media.duration
        ? (media.position / media.duration) * 100
        : null;

    return html`
      <sb-card>
        <div class="player">
          ${
            media?.thumbnail
              ? html`<img class="art" src=${media.thumbnail} alt="" />`
              : html`<div class="art">${icon(mdiMusicNote)}</div>`
          }
          <div class="info">
            <span class="chip status ${playing ? "success" : ""}"
              >${media?.status ?? "Idle"}</span
            >
            <h2 class="title truncate">
              ${media?.title ?? "Nothing is playing"}
            </h2>
            <span class="muted truncate">${media?.artist ?? ""}</span>
            <span class="muted small truncate"
              >${media?.album_title ?? ""}</span
            >
            ${
              percent === null || media === undefined
                ? nothing
                : html`<sb-meter
                    style="margin-top: var(--sb-space-3)"
                    .value=${percent}
                    display="${formatDuration(media.position ?? 0)} / ${formatDuration(media.duration ?? 0)}"
                    .warning=${101}
                    .danger=${101}
                  ></sb-meter>`
            }
            <div class="controls">
              ${this.#button("PREVIOUS", mdiSkipPrevious, {
                disabled: media?.is_previous_enabled === false,
              })}
              ${
                playing
                  ? this.#button("PAUSE", mdiPause, {
                      disabled: media?.is_pause_enabled === false,
                      main: true,
                    })
                  : this.#button("PLAY", mdiPlay, {
                      disabled: media?.is_play_enabled === false,
                      main: true,
                    })
              }
              ${this.#button("STOP", mdiStop, {
                disabled: media?.is_stop_enabled === false,
              })}
              ${this.#button("NEXT", mdiSkipNext, {
                disabled: media?.is_next_enabled === false,
              })}
            </div>
            <div class="controls" style="margin-top: 0">
              ${this.#button("VOLUME_DOWN", mdiVolumeMinus)}
              ${this.#button("MUTE", mdiVolumeOff)}
              ${this.#button("VOLUME_UP", mdiVolumePlus)}
              <span class="muted small tabular"
                >${
                  media?.volume === null || media?.volume === undefined
                    ? ""
                    : formatPercent(media.volume * 100)
                }</span
              >
            </div>
            <span class="muted xsmall" style="margin-top: var(--sb-space-3)">
              ${
                media?.updated_at === null || media?.updated_at === undefined
                  ? "No updates yet"
                  : `Updated ${formatAgo(media.updated_at * 1000)}`
              }
            </span>
          </div>
        </div>
      </sb-card>
    `;
  }

  override render() {
    const result = actionResult(
      this.#control.value,
      `${this.sent === null ? "Action" : actionLabels[this.sent]} sent.`,
    );

    return html`
      <div class="page narrow">
        ${this.renderHeader({
          heading: "Media controls",
          description: "Control what's playing on this system",
          icon: mdiPlayCircleOutline,
        })}
        ${this.renderResult(
          result,
          result?.success === false
            ? html`<span class="muted"
                >Check a player is running and supports it. On Linux this needs
                <code>playerctl</code>.</span
              >`
            : undefined,
        )}
        ${this.gate(() => this.#renderPlayer(), placeholder)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-media": PageMedia;
  }
}
