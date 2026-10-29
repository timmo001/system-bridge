import {
  mdiAlertCircleOutline,
  mdiCheckCircleOutline,
  mdiMusicNote,
  mdiPause,
  mdiPlay,
  mdiRepeat,
  mdiRepeatOff,
  mdiRepeatOnce,
  mdiShuffle,
  mdiShuffleDisabled,
  mdiSkipNext,
  mdiSkipPrevious,
  mdiStop,
  mdiVolumeMinus,
  mdiVolumeOff,
  mdiVolumePlus,
} from "@mdi/js";
import {
  MediaAction,
  type MediaControl,
  type MediaPlayer,
} from "@timmo001/effect-system-bridge";
import { Schema } from "effect";
import { css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { live } from "lit/directives/live.js";

import "~/components/sb-card";
import "~/components/sb-select";
import type { SelectOption } from "~/components/sb-select";
import { icon, pageStyles, shared } from "~/components/shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import {
  actionResult,
  latestModuleData,
  mediaControl,
  registry,
} from "~/lib/atoms";
import {
  formatAgo,
  formatDuration,
  formatPercent,
  formatPlayerStatus as statusLabel,
} from "~/lib/format";
import { type ShownMedia, shownMedia } from "~/lib/media";
import { mediaPlayer } from "~/lib/preferences";

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
  SEEK: "Seek",
  SET_VOLUME: "Volume",
  SET_SHUFFLE: "Shuffle",
  SET_REPEAT: "Repeat",
};

type Repeat = NonNullable<MediaControl["repeat"]>;

/** Each repeat setting, and the one a press moves on to. */
const repeatModes: Readonly<
  Record<
    Repeat,
    { readonly label: string; readonly icon: string; readonly next: Repeat }
  >
> = {
  NONE: { label: "Repeat off", icon: mdiRepeatOff, next: "LIST" },
  LIST: { label: "Repeat all", icon: mdiRepeat, next: "TRACK" },
  TRACK: { label: "Repeat one", icon: mdiRepeatOnce, next: "NONE" },
};

const isRepeat = (value: string | null | undefined): value is Repeat =>
  value === "NONE" || value === "LIST" || value === "TRACK";

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
        position: relative;
        display: grid;
        gap: var(--sb-space-6);
        grid-template-columns: minmax(0, 14rem) minmax(0, 1fr);
        align-items: center;
      }

      /* In the corner, clear of the title */
      .status {
        position: absolute;
        top: 0;
        right: 0;
      }

      .info .title {
        padding-inline-end: 6.5rem;
      }

      @media (max-width: 40rem) {
        .player {
          grid-template-columns: minmax(0, 1fr);
          justify-items: center;
          text-align: center;
        }

        .info .title {
          padding-inline-end: 0;
        }

        /* No corner free beside the art, so it sits above the title */
        .status {
          position: static;
        }
      }

      .progress {
        display: flex;
        flex-direction: column;
        gap: var(--sb-space-1);
        margin-top: var(--sb-space-4);
      }

      .progress .bar {
        height: 0.375rem;
        overflow: hidden;
        background: var(--sb-color-sunken);
        border-radius: var(--sb-radius-pill);
      }

      .progress .bar span {
        display: block;
        height: 100%;
        background: var(--sb-color-accent);
        border-radius: inherit;
      }

      .progress .times {
        display: flex;
        justify-content: space-between;
      }

      .progress .seek {
        width: 100%;
        margin: 0;
        accent-color: var(--sb-color-accent);
      }

      /* Shuffle or repeat that's on */
      .controls .button.pressed {
        color: var(--sb-color-accent);
      }

      .players {
        display: grid;
        gap: var(--sb-space-4);
        grid-template-columns: repeat(auto-fill, minmax(min(100%, 22rem), 1fr));
        margin-top: var(--sb-space-4);
      }

      .other {
        display: flex;
        align-items: center;
        gap: var(--sb-space-3);
      }

      .other .details {
        display: flex;
        flex: 1;
        flex-direction: column;
        min-width: 0;
      }

      .art.small {
        flex: none;
        width: 3rem;
        border-radius: var(--sb-radius-m);
        box-shadow: none;
        --sb-icon-size: 1.5rem;
      }

      .picker {
        width: 20rem;
        max-width: calc(100% - 6.5rem);
        margin-bottom: var(--sb-space-2);
      }

      @media (max-width: 40rem) {
        .picker {
          max-width: 100%;
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

      /* Playback in the true centre, stop at the start and volume at the
         end, whatever their widths */
      .controls {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
        grid-template-areas: "stop transport levels";
        align-items: center;
        gap: var(--sb-space-3) var(--sb-space-4);
        margin-top: var(--sb-space-3);
      }

      .controls .group {
        display: flex;
        align-items: center;
        gap: var(--sb-space-1);
      }

      .controls .stop {
        grid-area: stop;
        justify-self: start;
      }

      .controls .transport {
        grid-area: transport;
      }

      .controls .levels {
        grid-area: levels;
        justify-self: end;
      }

      .controls .volume {
        min-width: 4ch;
        margin-inline-start: var(--sb-space-0-5);
      }

      /* The volume shows its level, or a muted speaker. Hovering or
         focusing it turns it into a rounded group that grows to the left
         with the controls; the level stays put under the pointer. Touch
         screens can't hover, so they always show the group */
      .controls .levels {
        padding: var(--sb-space-1) var(--sb-space-2) var(--sb-space-1)
          var(--sb-space-1);
        border: 1px solid transparent;
        border-radius: var(--sb-radius-pill);
        transition:
          background var(--sb-duration-fast) var(--sb-easing),
          border-color var(--sb-duration-fast) var(--sb-easing);
      }

      .controls .volume {
        display: inline-flex;
        justify-content: center;
      }

      .controls .level {
        display: inline-flex;
        --sb-icon-size: 1.25rem;
      }

      .controls .reveal .button {
        width: 2rem;
      }

      .controls .reveal {
        display: flex;
        gap: var(--sb-space-0-5);
        max-width: 0;
        overflow: hidden;
        opacity: 0;
        transition:
          max-width var(--sb-duration-normal) var(--sb-easing),
          opacity var(--sb-duration-normal) var(--sb-easing);
      }

      .controls .levels:hover,
      .controls .levels:focus-within {
        background: var(--sb-color-sunken);
        border-color: var(--sb-color-border);
      }

      .controls .levels:hover .reveal,
      .controls .levels:focus-within .reveal {
        max-width: 8rem;
        opacity: 1;
      }

      @media (hover: none) {
        .controls .levels {
          background: var(--sb-color-sunken);
          border-color: var(--sb-color-border);
        }

        .controls .reveal {
          max-width: none;
          opacity: 1;
        }
      }

      /* Below full width there isn't room for the open volume beside
         playback, so playback gets a row of its own and the rest share the
         one under it */
      @media (max-width: 60rem) {
        .controls {
          grid-template-columns: auto 1fr;
          grid-template-areas:
            "transport transport"
            "stop levels";
        }

        .controls .transport {
          justify-self: center;
        }
      }

      .footer {
        display: flex;
        flex-wrap: wrap;
        align-items: start;
        justify-content: space-between;
        gap: var(--sb-space-1) var(--sb-space-4);
        min-height: 1lh;
        margin-top: var(--sb-space-3);
      }

      .footer .outcome {
        display: flex;
        min-width: 0;
      }

      .footer .message {
        display: inline-flex;
        align-items: start;
        gap: var(--sb-space-1);
        text-align: start;
        animation: fade-in var(--sb-duration-normal) var(--sb-easing);
        --sb-icon-size: 1em;
      }

      .footer .message > .icon {
        flex: none;
        margin-top: 0.15em;
      }

      .footer .message.success > .icon {
        color: var(--sb-color-success);
      }

      .footer .message.danger {
        color: var(--sb-color-danger);
      }

      @keyframes fade-in {
        from {
          opacity: 0;
        }
      }

      @media (max-width: 40rem) {
        .footer {
          justify-content: center;
        }
      }

      .controls .button.main {
        width: 3.5rem;
        --sb-icon-size: 1.75rem;
      }

      /* Unavailable, it keeps its circle, in grey */
      .controls .button.main:disabled {
        background: var(--sb-color-sunken);
        border-color: var(--sb-color-border);
      }
    `,
  ];

  readonly #data = new AtomController(this, () => latestModuleData);

  readonly #control = new AtomController(this, () => mediaControl);

  @state() private sent: MediaControl | null = null;

  /** Where the position slider is while it's dragged, before it's sent. */
  @state() private seekingTo: number | null = null;

  /** The player picked to show, or null for the one the backend picks. */
  readonly #chosen = new AtomController(this, () => mediaPlayer);

  protected readonly pageTitle = "Media controls";

  /** Redraws each second while playing, so the position moves. */
  #tick: ReturnType<typeof setInterval> | undefined;

  /** The picked player, while it's still running. */
  get #chosenPlayer(): MediaPlayer | undefined {
    return this.#data.value.media?.players.find(
      (player) => player.id === this.#chosen.value,
    );
  }

  /** What the player card shows: the picked player, or the backend's pick. */
  get #media(): ShownMedia | undefined {
    const media = this.#data.value.media;

    return media && shownMedia(media, this.#chosen.value);
  }

  /** Sends a control to the picked player, or the backend's pick without one. */
  get #playerKey(): { readonly player?: string } {
    const player = this.#chosenPlayer;

    return player === undefined ? {} : { player: player.id };
  }

  #choose(id: string | null) {
    registry.set(mediaPlayer, id);
  }

  protected override willUpdate(): void {
    // A picked player that's closed goes back to the backend's pick
    if (
      this.#chosen.value !== null &&
      this.#data.value.media !== undefined &&
      this.#chosenPlayer === undefined
    ) {
      this.#choose(null);
    }
  }

  protected override updated(): void {
    super.updated();

    const playing = this.#media?.status?.toLowerCase() === "playing";

    if (playing && this.#tick === undefined) {
      this.#tick = setInterval(() => this.requestUpdate(), 1000);
    } else if (!playing && this.#tick !== undefined) {
      clearInterval(this.#tick);
      this.#tick = undefined;
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    clearInterval(this.#tick);
    this.#tick = undefined;
  }

  #send(control: MediaControl) {
    this.sent = control;
    registry.set(mediaControl, control);
  }

  #onPlayerChange = (event: CustomEvent<{ readonly value: string }>) => {
    this.#choose(event.detail.value || null);
  };

  #onShowClick = (event: MouseEvent) => {
    if (event.currentTarget instanceof HTMLButtonElement) {
      this.#choose(event.currentTarget.dataset.player ?? null);
    }
  };

  #onControlClick = (event: MouseEvent) => {
    if (!(event.currentTarget instanceof HTMLButtonElement)) return;

    const { action, player } = event.currentTarget.dataset;

    if (!isMediaAction(action)) return;

    this.#send(player ? { action, player } : { action, ...this.#playerKey });
  };

  #onShuffleClick = () => {
    this.#send({
      action: "SET_SHUFFLE",
      shuffle: this.#media?.shuffle !== true,
      ...this.#playerKey,
    });
  };

  #onRepeatClick = () => {
    const repeat = this.#media?.repeat;

    this.#send({
      action: "SET_REPEAT",
      repeat: repeatModes[isRepeat(repeat) ? repeat : "NONE"].next,
      ...this.#playerKey,
    });
  };

  #onSeekInput = (event: Event) => {
    if (event.currentTarget instanceof HTMLInputElement) {
      this.seekingTo = event.currentTarget.valueAsNumber;
    }
  };

  /** Sends once let go, not on every step. */
  #onSeek = (event: Event) => {
    if (!(event.currentTarget instanceof HTMLInputElement)) return;

    this.#send({
      action: "SEEK",
      position: event.currentTarget.valueAsNumber,
      ...this.#playerKey,
    });
    this.seekingTo = null;
  };

  #button(
    action: MediaAction,
    path: string,
    options: {
      readonly disabled?: boolean;
      readonly main?: boolean;
      readonly small?: boolean;
      /** Another player's id, to control it rather than the one shown. */
      readonly player?: string;
      readonly label?: string;
    } = {},
  ) {
    const pending =
      this.#control.value.waiting &&
      this.sent?.action === action &&
      this.sent.player === (options.player ?? this.#chosenPlayer?.id);

    // With no player there's nothing to control
    const disabled =
      options.disabled === true ||
      pending ||
      (options.player === undefined &&
        this.#chosenPlayer === undefined &&
        !this.#media?.title);

    const label = options.label ?? actionLabels[action];

    // A main button that can't be used is greyed, like the others
    return html`<button
      class="button round icon-only ${options.small ? "" : "large"} ${options.main ? "main" : ""} ${options.main && !disabled ? "filled" : "plain"}"
      type="button"
      aria-label=${label}
      title=${label}
      ?disabled=${disabled}
      data-action=${action}
      data-player=${options.player ?? ""}
      @click=${this.#onControlClick}
    >
      ${icon(path)}
    </button>`;
  }

  /** A button that turns shuffle on or off, or moves repeat on. */
  #toggle(
    label: string,
    path: string,
    pressed: boolean,
    action: MediaAction,
    onClick: () => void,
  ) {
    const pending = this.#control.value.waiting && this.sent?.action === action;

    return html`<button
      class="button round icon-only plain ${pressed ? "pressed" : ""}"
      type="button"
      aria-label=${label}
      aria-pressed=${pressed ? "true" : "false"}
      title=${label}
      ?disabled=${pending}
      @click=${onClick}
    >
      ${icon(path)}
    </button>`;
  }

  /** Picks which player the card shows, when there's more than one. */
  #renderPicker() {
    const players = this.#data.value.media?.players ?? [];

    if (players.length < 2) return nothing;

    const options: readonly SelectOption[] = [
      { value: "", label: "Automatic" },
      ...players.map((player) => ({
        value: player.id,
        label: player.name,
        description: player.title || undefined,
      })),
    ];

    return html`<sb-select
      class="picker"
      label="Player"
      search-placeholder="Search players"
      .options=${options}
      .value=${this.#chosenPlayer?.id ?? ""}
      @value-changed=${this.#onPlayerChange}
    ></sb-select>`;
  }

  #renderPlayer() {
    const media = this.#media;
    const playing = media?.status?.toLowerCase() === "playing";

    // The backend reports the position when it last read the player, so
    // carry it on from then while playing
    const position =
      media?.position === null || media?.position === undefined
        ? null
        : playing && media.updated_at !== null
          ? media.position + Math.max(0, Date.now() / 1000 - media.updated_at)
          : media.position;

    const duration = media?.duration ?? null;

    const progress =
      position === null || !duration
        ? null
        : Math.min(100, (position / duration) * 100);

    // While the slider's dragged, the times follow it
    const shown = this.seekingTo ?? position;

    const result = actionResult(
      this.#control.value,
      `${this.sent === null ? "Action" : actionLabels[this.sent.action]} sent.`,
    );

    const repeat = isRepeat(media?.repeat) ? repeatModes[media.repeat] : null;

    return html`
      <sb-card>
        <div class="player" role="region" aria-label="Player">
          ${
            media?.thumbnail
              ? html`<img
                  class="art"
                  src=${media.thumbnail}
                  alt=${media.album_title ? `Artwork for ${media.album_title}` : "Artwork"}
                />`
              : html`<div class="art" aria-hidden="true">
                  ${icon(mdiMusicNote)}
                </div>`
          }
          <span
            class="chip status ${playing ? "success" : ""}"
            role="status"
            aria-label="Player status: ${statusLabel(media?.status)}"
            >${statusLabel(media?.status)}</span
          >
          <div class="info">
            ${this.#renderPicker()}
            <h2 class="title truncate">
              ${media?.title ?? "Nothing is playing"}
            </h2>
            <!-- Every row is always there, so nothing moves when playback
              starts or stops -->
            <span class="muted truncate">${media?.artist || " "}</span>
            <span class="muted small truncate"
              >${media?.album_title || " "}</span
            >
            <div class="progress">
              ${
                media?.is_seek_enabled && duration
                  ? html`<input
                      class="seek"
                      type="range"
                      min="0"
                      max=${Math.floor(duration)}
                      step="1"
                      aria-label="Position"
                      aria-valuetext=${`${formatDuration(shown ?? 0)} of ${formatDuration(duration)}`}
                      .value=${live(String(Math.round(shown ?? 0)))}
                      ?disabled=${this.#control.value.waiting && this.sent?.action === "SEEK"}
                      @input=${this.#onSeekInput}
                      @change=${this.#onSeek}
                    />`
                  : html`<div
                      class="bar"
                      role="progressbar"
                      aria-label="Position"
                      aria-valuemin="0"
                      aria-valuemax=${duration ?? 0}
                      aria-valuenow=${Math.round(position ?? 0)}
                      aria-valuetext=${
                        position === null || duration === null
                          ? "Nothing playing"
                          : `${formatDuration(position)} of ${formatDuration(duration)}`
                      }
                    >
                      <span style="width: ${progress ?? 0}%"></span>
                    </div>`
              }
              <span class="times muted xsmall tabular" aria-hidden="true">
                <span>${shown === null ? "-:--" : formatDuration(shown)}</span>
                <span
                  >${duration === null ? "-:--" : formatDuration(duration)}</span
                >
              </span>
            </div>
            <div class="controls">
              <span class="group stop">
                ${this.#button("STOP", mdiStop, {
                  disabled: media?.is_stop_enabled === false,
                })}
                ${
                  media?.shuffle === null || media?.shuffle === undefined
                    ? nothing
                    : this.#toggle(
                        media.shuffle ? "Shuffle on" : "Shuffle off",
                        media.shuffle ? mdiShuffle : mdiShuffleDisabled,
                        media.shuffle,
                        "SET_SHUFFLE",
                        this.#onShuffleClick,
                      )
                }
                ${
                  repeat === null
                    ? nothing
                    : this.#toggle(
                        repeat.label,
                        repeat.icon,
                        media?.repeat !== "NONE",
                        "SET_REPEAT",
                        this.#onRepeatClick,
                      )
                }
              </span>
              <span class="group transport" role="group" aria-label="Playback">
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
                ${this.#button("NEXT", mdiSkipNext, {
                  disabled: media?.is_next_enabled === false,
                })}
              </span>
              <span class="group levels" role="group" aria-label="Volume">
                <span class="reveal">
                  ${this.#button("VOLUME_DOWN", mdiVolumeMinus, { small: true })}
                  ${this.#button("MUTE", mdiVolumeOff, { small: true })}
                  ${this.#button("VOLUME_UP", mdiVolumePlus, { small: true })}
                </span>
                <!-- The volume, or a muted speaker in its place -->
                <span
                  class="muted small tabular volume"
                  role="status"
                  aria-label=${
                    media?.volume === null || media?.volume === undefined
                      ? "Volume unknown"
                      : media.volume === 0
                        ? "Muted"
                        : `Volume ${formatPercent(media.volume * 100)}`
                  }
                  >${
                    media?.volume === 0
                      ? html`<span
                          class="level"
                          title="Muted"
                          aria-hidden="true"
                          >${icon(mdiVolumeOff)}</span
                        >`
                      : media?.volume === null || media?.volume === undefined
                        ? nothing
                        : formatPercent(media.volume * 100)
                  }</span
                >
              </span>
            </div>
            <div class="footer xsmall">
              <span class="muted">
                ${
                  media?.updated_at === null || media?.updated_at === undefined
                    ? "No updates yet"
                    : `Updated ${formatAgo(media.updated_at * 1000)}`
                }
              </span>
              <!-- Always there, so the outcome of a control fades in without
                moving anything -->
              <span class="outcome" role="status" aria-live="polite">
                ${
                  result === null
                    ? nothing
                    : html`<span
                        class="message ${result.success ? "success" : "danger"}"
                      >
                        ${icon(
                          result.success
                            ? mdiCheckCircleOutline
                            : mdiAlertCircleOutline,
                        )}
                        <span
                          >${result.message}
                          ${
                            result.success
                              ? nothing
                              : html`Check a player is running and supports it.`
                          }</span
                        >
                      </span>`
                }
              </span>
            </div>
          </div>
        </div>
      </sb-card>
    `;
  }

  /** The players other than the one shown, each as a smaller card. */
  #renderOtherPlayers() {
    const shown = this.#media?.player;

    const others = (this.#data.value.media?.players ?? []).filter(
      (player) => player.id !== shown,
    );

    if (others.length === 0) return nothing;

    const cards = others.map((player) => this.#renderOtherPlayer(player));

    return html`<div class="players">${cards}</div>`;
  }

  #renderOtherPlayer(player: MediaPlayer) {
    const playing = player.status === "PLAYING";
    const name = player.title || player.name;

    return html`<sb-card>
      <div class="other" role="region" aria-label=${name}>
        ${
          player.thumbnail
            ? html`<img class="art small" src=${player.thumbnail} alt="" />`
            : html`<div class="art small" aria-hidden="true">
                ${icon(mdiMusicNote)}
              </div>`
        }
        <span class="details">
          <span class="truncate">${name}</span>
          <span class="muted small truncate"
            >${[
              statusLabel(player.status),
              player.artist,
              player.title ? player.name : "",
            ]
              .filter(Boolean)
              .join(" · ")}</span
          >
        </span>
        ${this.#button(
          playing ? "PAUSE" : "PLAY",
          playing ? mdiPause : mdiPlay,
          {
            disabled: playing
              ? player.is_pause_enabled === false
              : player.is_play_enabled === false,
            small: true,
            player: player.id,
            label: `${playing ? "Pause" : "Play"} ${name}`,
          },
        )}
        <button
          class="button plain small"
          type="button"
          data-player=${player.id}
          @click=${this.#onShowClick}
        >
          Show
        </button>
      </div>
    </sb-card>`;
  }

  override render() {
    return html`
      <div class="page narrow">
        <!-- On the Media page, the player sits right under its heading, so it
          needs none of its own -->
        ${this.gate(
          () => html`${this.#renderPlayer()} ${this.#renderOtherPlayers()}`,
          placeholder,
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-media": PageMedia;
  }
}
