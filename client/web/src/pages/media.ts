import type { MediaAction, MediaData } from "@timmo001/effect-system-bridge";
import { html, type TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";

import { AtomController } from "~/controllers/atom-controller";
import {
  actionResult,
  latestModuleData,
  mediaControl,
  registry,
} from "~/lib/atoms";
import { getResultStyle } from "~/lib/result-styles";
import { formatDuration } from "~/lib/utils";
import { PageElement } from "~/mixins/page-element";
import "../components/ui/button";
import "../components/ui/connection-required";
import "../components/ui/icon";

interface StatusConfig {
  bg: string;
  text: string;
  icon: string;
}

const statusStyles = new Map<string, StatusConfig>(
  Object.entries({
    playing: {
      bg: "bg-green-500/20",
      text: "text-green-400",
      icon: "Play",
    },
    paused: {
      bg: "bg-yellow-500/20",
      text: "text-yellow-400",
      icon: "Pause",
    },
    stopped: {
      bg: "bg-red-500/20",
      text: "text-red-400",
      icon: "Square",
    },
  }),
);

const defaultStatusStyle: StatusConfig = {
  bg: "bg-gray-500/20",
  text: "text-gray-400",
  icon: "Circle",
};

@customElement("page-media")
class PageMedia extends PageElement {
  title = "Media Controls";
  description = "Control media playback on this system";

  readonly #data = new AtomController(this, () => latestModuleData);

  readonly #control = new AtomController(this, () => mediaControl);

  @state()
  private sentAction: MediaAction | null = null;

  /** The action waiting for a reply, if any. */
  private get pendingAction(): MediaAction | null {
    return this.#control.value.waiting ? this.sentAction : null;
  }

  private handleNavigateToConnection = (): void => {
    this.navigate("/connection");
  };

  private sendMediaAction(action: MediaAction): void {
    this.sentAction = action;
    registry.set(mediaControl, action);
  }

  private handlePlay = (): void => this.sendMediaAction("PLAY");
  private handlePause = (): void => this.sendMediaAction("PAUSE");
  private handleStop = (): void => this.sendMediaAction("STOP");
  private handleNext = (): void => this.sendMediaAction("NEXT");
  private handlePrevious = (): void => this.sendMediaAction("PREVIOUS");
  private handleVolumeUp = (): void => this.sendMediaAction("VOLUME_UP");
  private handleVolumeDown = (): void => this.sendMediaAction("VOLUME_DOWN");
  private handleMute = (): void => this.sendMediaAction("MUTE");

  private get mediaData(): MediaData | null {
    return this.#data.value.media ?? null;
  }

  private get isPlaying(): boolean {
    return this.mediaData?.status?.toLowerCase() === "playing";
  }

  private get hasMedia(): boolean {
    const media = this.mediaData;

    return !!(media?.title || media?.artist || media?.status);
  }

  private formatLastUpdated(timestamp: number | null | undefined): string {
    if (timestamp == null) {
      return "Never";
    }

    const date = new Date(timestamp * 1000); // Convert seconds to milliseconds
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 5) {
      return "Just now";
    } else if (diffSeconds < 60) {
      return `${diffSeconds} seconds ago`;
    } else if (diffSeconds < 3600) {
      const minutes = Math.floor(diffSeconds / 60);

      return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    } else {
      return date.toLocaleTimeString();
    }
  }

  private renderStatusBadge(): TemplateResult {
    const status = this.mediaData?.status ?? "Unknown";
    const config = statusStyles.get(status.toLowerCase()) ?? defaultStatusStyle;

    return html`
      <div
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}"
      >
        <ui-icon name=${config.icon} class="size-3"></ui-icon>
        ${status}
      </div>
    `;
  }

  private renderAlbumArt(): TemplateResult {
    const thumbnail = this.mediaData?.thumbnail;

    if (thumbnail) {
      return html`
        <img
          src=${thumbnail}
          alt="Album art"
          class="w-24 h-24 rounded-lg object-cover shadow-md"
        />
      `;
    }

    return html`
      <div
        class="w-24 h-24 rounded-lg bg-muted flex items-center justify-center"
      >
        <ui-icon name="Music" class="size-10 text-muted-foreground"></ui-icon>
      </div>
    `;
  }

  private computeProgress(): {
    positionStr: string;
    durationStr: string;
    percent: number;
  } | null {
    const position = this.mediaData?.position;
    const duration = this.mediaData?.duration;

    if (position == null && duration == null) return null;

    const positionStr = position != null ? formatDuration(position) : "--:--";
    const durationStr = duration != null ? formatDuration(duration) : "--:--";

    const percent =
      position != null && duration != null && duration > 0
        ? Math.min((position / duration) * 100, 100)
        : 0;

    return { positionStr, durationStr, percent };
  }

  private renderProgress(): TemplateResult {
    const progress = this.computeProgress();

    if (!progress) return html``;

    return html`
      <div class="space-y-1.5">
        <div class="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            class="h-full bg-primary rounded-full transition-all duration-300"
            style="width: ${progress.percent}%"
          ></div>
        </div>
        <div class="flex justify-between text-xs text-muted-foreground">
          <span>${progress.positionStr}</span>
          <span>${progress.durationStr}</span>
        </div>
      </div>
    `;
  }

  private renderLastUpdated(): TemplateResult {
    const updatedAt = this.mediaData?.updated_at;
    const lastUpdatedStr = this.formatLastUpdated(updatedAt);

    return html`
      <div
        class="flex items-center gap-1.5 text-xs text-muted-foreground/70"
        title=${
          updatedAt
            ? `Last updated: ${new Date(updatedAt * 1000).toLocaleString()}`
            : "No update received"
        }
      >
        <ui-icon name="Clock" class="size-3"></ui-icon>
        <span>Updated ${lastUpdatedStr}</span>
      </div>
    `;
  }

  private renderNowPlayingCard(): TemplateResult {
    const media = this.mediaData;

    if (!media || !this.hasMedia) {
      return html`
        <div class="rounded-lg border bg-card p-6">
          <div class="flex flex-col items-center justify-center py-8 gap-4">
            <div
              class="w-16 h-16 rounded-full bg-muted flex items-center justify-center"
            >
              <ui-icon
                name="Music"
                class="size-8 text-muted-foreground"
              ></ui-icon>
            </div>
            <div class="text-center">
              <p class="text-lg font-medium text-muted-foreground">
                No media playing
              </p>
              <p class="text-sm text-muted-foreground/70">
                Start playing media on this system to see it here
              </p>
            </div>
          </div>
          ${this.renderLastUpdated()}
        </div>
      `;
    }

    const albumTitle = media.album_title;

    return html`
      <div class="rounded-lg border bg-card p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold">Now Playing</h2>
          ${this.renderStatusBadge()}
        </div>

        <div class="flex gap-4">
          ${this.renderAlbumArt()}
          <div class="flex-1 min-w-0 space-y-1">
            <p class="text-lg font-semibold truncate">
              ${media.title ?? "Unknown Title"}
            </p>
            <p class="text-sm text-muted-foreground truncate">
              ${media.artist ?? "Unknown Artist"}
            </p>
            ${
              albumTitle
                ? html`<p class="text-xs text-muted-foreground/70 truncate">
                    ${albumTitle}
                  </p>`
                : ""
            }
          </div>
        </div>

        ${this.renderProgress()} ${this.renderLastUpdated()}
      </div>
    `;
  }

  private getControlStates() {
    const media = this.mediaData;

    return {
      PREVIOUS: media?.is_previous_enabled === false,
      PLAY: media?.is_play_enabled === false,
      PAUSE: media?.is_pause_enabled === false,
      STOP: media?.is_stop_enabled === false,
      NEXT: media?.is_next_enabled === false,
    };
  }

  private renderPlaybackControls(): TemplateResult {
    const disabled = this.getControlStates();

    return html`
      <div class="rounded-lg border bg-card p-6 space-y-4">
        <h2 class="text-xl font-semibold">Playback Controls</h2>

        <div class="flex items-center justify-center gap-2">
          <ui-button
            variant="outline"
            size="icon"
            ?disabled=${disabled.PREVIOUS || this.pendingAction === "PREVIOUS"}
            @click=${this.handlePrevious}
            title="Previous"
          >
            <ui-icon name="SkipBack" class="size-5"></ui-icon>
          </ui-button>

          ${
            this.isPlaying
              ? html`
                  <ui-button
                    variant="default"
                    size="icon"
                    class="size-12"
                    ?disabled=${disabled.PAUSE || this.pendingAction === "PAUSE"}
                    @click=${this.handlePause}
                    title="Pause"
                  >
                    <ui-icon name="Pause" class="size-6"></ui-icon>
                  </ui-button>
                `
              : html`
                  <ui-button
                    variant="default"
                    size="icon"
                    class="size-12"
                    ?disabled=${disabled.PLAY || this.pendingAction === "PLAY"}
                    @click=${this.handlePlay}
                    title="Play"
                  >
                    <ui-icon name="Play" class="size-6"></ui-icon>
                  </ui-button>
                `
          }

          <ui-button
            variant="outline"
            size="icon"
            ?disabled=${disabled.STOP || this.pendingAction === "STOP"}
            @click=${this.handleStop}
            title="Stop"
          >
            <ui-icon name="Square" class="size-5"></ui-icon>
          </ui-button>

          <ui-button
            variant="outline"
            size="icon"
            ?disabled=${disabled.NEXT || this.pendingAction === "NEXT"}
            @click=${this.handleNext}
            title="Next"
          >
            <ui-icon name="SkipForward" class="size-5"></ui-icon>
          </ui-button>
        </div>
      </div>
    `;
  }

  private renderVolumeControls(): TemplateResult {
    const media = this.mediaData;
    const volume = media?.volume;

    const volumeDisplay =
      volume != null ? `${Math.round(volume * 100)}%` : null;

    return html`
      <div class="rounded-lg border bg-card p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold">Volume</h2>
          ${
            volumeDisplay
              ? html`<span class="text-sm text-muted-foreground"
                  >${volumeDisplay}</span
                >`
              : ""
          }
        </div>

        <div class="flex items-center justify-center gap-2">
          <ui-button
            variant="outline"
            size="icon"
            ?disabled=${this.pendingAction === "VOLUME_DOWN"}
            @click=${this.handleVolumeDown}
            title="Volume Down"
          >
            <ui-icon name="Volume1" class="size-5"></ui-icon>
          </ui-button>

          <ui-button
            variant="outline"
            size="icon"
            ?disabled=${this.pendingAction === "MUTE"}
            @click=${this.handleMute}
            title="Mute"
          >
            <ui-icon name="VolumeX" class="size-5"></ui-icon>
          </ui-button>

          <ui-button
            variant="outline"
            size="icon"
            ?disabled=${this.pendingAction === "VOLUME_UP"}
            @click=${this.handleVolumeUp}
            title="Volume Up"
          >
            <ui-icon name="Volume2" class="size-5"></ui-icon>
          </ui-button>
        </div>
      </div>
    `;
  }

  private renderActionResult(): TemplateResult {
    const result = actionResult(
      this.#control.value,
      `${this.sentAction} action completed`,
    );

    if (!result) return html``;

    const { success, message } = result;
    const style = getResultStyle(success);

    const errorHint = !success
      ? html`<div class="text-xs mt-2 text-red-400/80">
          <p class="mb-1">Common causes:</p>
          <ul class="list-disc list-inside space-y-0.5">
            <li>No media player is active</li>
            <li>The player does not support this action</li>
            <li>The action is not supported on this platform</li>
            <li>Required tools (e.g., playerctl on Linux) are not installed</li>
          </ul>
        </div>`
      : "";

    return html`
      <div
        class="rounded-lg border p-4 flex items-start gap-3 ${style.borderClass} ${style.bgClass}"
      >
        <ui-icon name=${style.iconName} class="${style.iconClass}"></ui-icon>
        <div class="flex-1">
          <div class="font-medium ${style.headingClass}">${style.heading}</div>
          <div class="text-sm mt-1 ${style.bodyClass}">${message}</div>
          ${errorHint}
        </div>
      </div>
    `;
  }

  render() {
    const isConnected = this.status?.isConnected ?? false;

    return html`
      <div class="min-h-screen bg-background text-foreground p-8">
        <div class="max-w-4xl mx-auto space-y-6">
          ${this.renderPageHeader()}
          ${this.renderWithConnection(
            isConnected,
            "Connect to a System Bridge server to control media playback.",
            this.handleNavigateToConnection,
            html`
              ${this.renderActionResult()} ${this.renderNowPlayingCard()}

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                ${this.renderPlaybackControls()} ${this.renderVolumeControls()}
              </div>
            `,
          )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-media": PageMedia;
  }
}
