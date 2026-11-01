import {
  mdiAccountVoice,
  mdiHeadphones,
  mdiHeadphonesOff,
  mdiHeadset,
  mdiMicrophone,
  mdiMicrophoneOff,
  mdiMonitorShare,
  mdiPhoneHangup,
  mdiVideo,
  mdiVideoOff,
  mdiVolumeHigh,
  mdiVolumeOff,
} from "@mdi/js";
import {
  DiscordAction,
  type DiscordAudio,
  type DiscordCallMember,
  type DiscordControl,
  type DiscordData,
  DiscordVoiceModeType,
} from "@timmo001/effect-system-bridge";
import { Schema } from "effect";
import { css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { live } from "lit/directives/live.js";

import "@timmo001/groundwork-ui/gw-button.ts";
import "@timmo001/groundwork-ui/gw-card.ts";
import "@timmo001/groundwork-ui/gw-range.ts";
import "@timmo001/groundwork-ui/gw-segmented.ts";
import "@timmo001/groundwork-ui/gw-select.ts";
import { rangeTarget, selectValue } from "~/lib/select";
import { AtomController } from "~/controllers/atom-controller";
import {
  actionResult,
  discordControl,
  latestModuleData,
  registry,
} from "~/lib/atoms";

import { SbPage } from "./sb-page";

const isDiscordAction = Schema.is(DiscordAction);

const isVoiceMode = Schema.is(DiscordVoiceModeType);

/** The backend's limits for each value, from `discord/control.go`. */
const limits = {
  input: 100,
  output: 200,
  user: 200,
  thresholdMin: -100,
  delay: 2000,
} as const;

const voiceModes = [
  { value: "VOICE_ACTIVITY", label: "Voice activity", icon: mdiAccountVoice },
  { value: "PUSH_TO_TALK", label: "Push to talk", icon: mdiMicrophone },
] as const;

/** A member's name as the call shows it. */
const memberName = (member: DiscordCallMember) =>
  member.nick ?? member.user.global_name ?? member.user.username;

const deviceOptions = (audio: DiscordAudio | null) =>
  (audio?.devices ?? []).map((device) => ({
    value: device.id,
    label: device.name,
  }));

/** Controls for the Discord desktop app: voice, audio, the call and sounds. */
@customElement("page-discord")
export class PageDiscord extends SbPage {
  static override styles = [
    ...SbPage.styles,
    css`
      .toggles {
        display: flex;
        flex-wrap: wrap;
        gap: var(--gw-space-2);
      }

      gw-range {
        flex: 1;
      }

      .members {
        display: flex;
        flex-direction: column;
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .member {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        gap: var(--gw-space-2) var(--gw-space-3);
        padding: var(--gw-space-3) 0;
      }

      .member + .member {
        border-top: 1px solid var(--gw-color-border-normal);
      }

      .member .level {
        grid-column: 2 / -1;
      }

      .avatar {
        width: 2rem;
        height: 2rem;
        background: var(--gw-color-surface-lower);
        border-radius: 50%;
        object-fit: cover;
      }

      .avatar.speaking {
        outline: 2px solid var(--gw-color-success);
        outline-offset: 1px;
      }

      .controls {
        align-items: start;
      }

      /* The soundboard can hold dozens of sounds, so it gets the full width
         rather than a tall column */
      .controls > .wide {
        grid-column: 1 / -1;
      }

      .sounds {
        display: flex;
        flex-wrap: wrap;
        gap: var(--gw-space-2);
      }
    `,
  ];

  readonly #data = new AtomController(this, () => latestModuleData);

  readonly #control = new AtomController(this, () => discordControl);

  /** Which control was used last, to show it as busy and name it on failure. */
  @state() private sent: {
    readonly key: string;
    readonly label: string;
  } | null = null;

  protected readonly pageTitle = "Discord controls";

  #send(control: DiscordControl, label: string, key: string = control.action) {
    this.sent = { key, label };
    registry.set(discordControl, control);
  }

  #busy(key: string) {
    return this.#control.value.waiting && this.sent?.key === key;
  }

  /** Buttons carry their action, and a user or sound when it needs one. */
  #onButton = (event: MouseEvent) => {
    if (!(event.currentTarget instanceof HTMLElement)) return;

    const { action, user, sound, label } = event.currentTarget.dataset;

    if (!isDiscordAction(action)) return;

    const control: DiscordControl =
      user !== undefined
        ? { action, user_id: user }
        : sound !== undefined
          ? { action, sound_id: sound }
          : { action };

    this.#send(control, label ?? action, `${action}:${user ?? sound ?? ""}`);
  };

  /** Sliders send once let go, not on every step. */
  #onRange = (event: Event) => {
    const range = rangeTarget(event);

    if (range === null) return;

    const { action, user, label } = range.dataset;

    if (!isDiscordAction(action)) return;

    const value = range.value;

    const control: DiscordControl =
      user === undefined ? { action, value } : { action, value, user_id: user };

    this.#send(control, label ?? action, `${action}:${user ?? ""}`);
  };

  #onSwitch = (event: Event) => {
    const host = event.currentTarget;
    const input = event.target;

    if (
      !(host instanceof HTMLElement) ||
      !(input instanceof HTMLInputElement)
    ) {
      return;
    }

    const { on, off, label } = host.dataset;
    const action = input.checked ? on : off;

    if (isDiscordAction(action)) this.#send({ action }, label ?? action);
  };

  #onInputDevice = (event: Event) => {
    this.#send(
      { action: "SET_INPUT_DEVICE", device_id: selectValue(event) },
      "Input device",
    );
  };

  #onOutputDevice = (event: Event) => {
    this.#send(
      { action: "SET_OUTPUT_DEVICE", device_id: selectValue(event) },
      "Output device",
    );
  };

  #onVoiceMode = (event: Event) => {
    const mode = selectValue(event);

    if (isVoiceMode(mode)) {
      this.#send({ action: "SET_VOICE_MODE", mode }, "Voice mode");
    }
  };

  #toggle(
    action: DiscordAction,
    options: {
      readonly label: string;
      readonly pressed: boolean | null;
      readonly on: string;
      readonly off: string;
      readonly disabled?: boolean;
    },
  ) {
    return html`<gw-button
      variant=${options.pressed === true ? "danger" : "neutral"}
      appearance="outlined"
      toggle
      ?pressed=${options.pressed === true}
      icon=${options.pressed === true ? options.on : options.off}
      ?disabled=${options.disabled === true || options.pressed === null || this.#busy(`${action}:`)}
      data-action=${action}
      data-label=${options.label}
      @click=${this.#onButton}
      >${options.label}</gw-button
    >`;
  }

  #level(options: {
    readonly id: string;
    readonly label: string;
    readonly action: DiscordAction;
    readonly value: number | null;
    readonly min?: number;
    readonly max: number;
    readonly step?: number;
    readonly user?: string;
  }) {
    return html`<gw-range
      id=${options.id}
      class="level"
      label=${options.label}
      label-hidden
      unit="%"
      readout
      .min=${options.min ?? 0}
      .max=${options.max}
      .step=${options.step ?? 1}
      .value=${live(options.value ?? 0)}
      ?disabled=${options.value === null}
      data-action=${options.action}
      data-label=${options.label}
      data-user=${options.user ?? nothing}
      @change=${this.#onRange}
    ></gw-range>`;
  }

  #renderVoice(discord: DiscordData) {
    const call = discord.call;

    return html`
      <gw-card
        level=${this.cardLevel}
        heading="Voice"
        description=${
          call === null
            ? "Not in a call"
            : `In ${[call.server?.name, call.channel.name].filter(Boolean).join(" › ")}`
        }
      >
        ${
          call === null
            ? nothing
            : html`<gw-button
                slot="actions"
                variant="danger"
                appearance="filled"
                size="small"
                icon=${mdiPhoneHangup}
                ?loading=${this.#busy("LEAVE_VOICE_CHANNEL:")}
                data-action="LEAVE_VOICE_CHANNEL"
                data-label="Leave the call"
                @click=${this.#onButton}
                >Leave</gw-button
              >`
        }
        <div class="toggles" role="group" aria-label="Voice">
          ${this.#toggle("TOGGLE_MUTE", {
            label: "Mute",
            pressed: discord.mute,
            on: mdiMicrophoneOff,
            off: mdiMicrophone,
          })}
          ${this.#toggle("TOGGLE_DEAFEN", {
            label: "Deafen",
            pressed: discord.deaf,
            on: mdiHeadphonesOff,
            off: mdiHeadphones,
          })}
          ${this.#toggle("TOGGLE_VIDEO", {
            label: "Video",
            pressed: discord.video,
            on: mdiVideo,
            off: mdiVideoOff,
            disabled: call === null,
          })}
          ${this.#toggle("TOGGLE_SCREENSHARE", {
            label: "Screen share",
            pressed: discord.screenshare,
            on: mdiMonitorShare,
            off: mdiMonitorShare,
            disabled: call === null,
          })}
        </div>
      </gw-card>
    `;
  }

  #renderAudio(discord: DiscordData) {
    return html`
      <gw-card level=${this.cardLevel} heading="Audio">
        <gw-setting-row heading="Input">
          <div class="row wrap">
            <gw-select
              style="width: 16rem"
              label="Input device"
              label-hidden
              .options=${deviceOptions(discord.input)}
              .value=${discord.input?.device_id ?? ""}
              ?disabled=${(discord.input?.devices.length ?? 0) === 0}
              @change=${this.#onInputDevice}
            ></gw-select>
            ${this.#level({
              id: "input-volume",
              label: "Input volume",
              action: "SET_INPUT_VOLUME",
              value: discord.input?.volume ?? null,
              max: limits.input,
            })}
          </div>
        </gw-setting-row>
        <gw-setting-row heading="Output">
          <div class="row wrap">
            <gw-select
              style="width: 16rem"
              label="Output device"
              label-hidden
              .options=${deviceOptions(discord.output)}
              .value=${discord.output?.device_id ?? ""}
              ?disabled=${(discord.output?.devices.length ?? 0) === 0}
              @change=${this.#onOutputDevice}
            ></gw-select>
            ${this.#level({
              id: "output-volume",
              label: "Output volume",
              action: "SET_OUTPUT_VOLUME",
              value: discord.output?.volume ?? null,
              max: limits.output,
            })}
          </div>
        </gw-setting-row>
      </gw-card>
    `;
  }

  #renderMode(discord: DiscordData) {
    const mode = discord.mode;
    const pushToTalk = mode?.type === "PUSH_TO_TALK";

    return html`
      <gw-card level=${this.cardLevel} heading="Voice settings">
        <gw-segmented
          label="Input mode"
          size="small"
          .options=${voiceModes}
          .value=${mode?.type ?? ""}
          @change=${this.#onVoiceMode}
        ></gw-segmented>
        ${
          pushToTalk
            ? html`<gw-range
                label="Release delay"
                unit="ms"
                readout
                .min=${0}
                .max=${limits.delay}
                .step=${20}
                .value=${live(mode.delay)}
                data-action="SET_PUSH_TO_TALK_DELAY"
                data-label="Push to talk release delay"
                @change=${this.#onRange}
              ></gw-range>`
            : html`<gw-range
                label="Sensitivity"
                unit="dB"
                readout
                hint=${
                  mode?.auto_threshold === true
                    ? "Discord sets this itself while automatic sensitivity is on in its settings."
                    : ""
                }
                .min=${limits.thresholdMin}
                .max=${0}
                .value=${live(mode?.threshold ?? 0)}
                ?disabled=${mode?.threshold === undefined}
                data-action="SET_VOICE_THRESHOLD"
                data-label="Voice activity sensitivity"
                @change=${this.#onRange}
              ></gw-range>`
        }
        <div>
          ${this.#switch(
            "Quality of service",
            "Ask the network to prioritise voice.",
            discord.qos,
            ["ENABLE_QOS", "DISABLE_QOS"],
          )}
          ${this.#switch(
            "Silence warning",
            "Warn when Discord hears nothing from your microphone.",
            discord.silence_warning,
            ["ENABLE_SILENCE_WARNING", "DISABLE_SILENCE_WARNING"],
          )}
        </div>
      </gw-card>
    `;
  }

  /**
   * A switch for a setting Discord reports. It shows what Discord says, so a
   * change that fails springs back.
   */
  #switch(
    label: string,
    hint: string,
    checked: boolean | null,
    [on, off]: readonly [DiscordAction, DiscordAction],
  ) {
    return html`<gw-setting-row heading=${label} description=${hint}>
      <gw-switch
        label=${label}
        label-hidden
        .checked=${live(checked === true)}
        ?disabled=${checked === null || this.#busy(on) || this.#busy(off)}
        data-on=${on}
        data-off=${off}
        data-label=${label}
        @change=${this.#onSwitch}
      ></gw-switch>
    </gw-setting-row>`;
  }

  #renderCall(discord: DiscordData) {
    const call = discord.call;

    if (call === null) return nothing;

    const me = call.me?.user.id ?? discord.user?.id;

    const others = call.members
      .filter((member) => member.user.id !== me)
      .map((member) => this.#renderMember(member));

    return html`
      <gw-card
        level=${this.cardLevel}
        heading="In the call"
        description="Only changes what you hear"
      >
        ${
          others.length === 0
            ? html`<p class="muted small">Nobody else is here.</p>`
            : html`<ul class="members">
                ${others}
              </ul>`
        }
      </gw-card>
    `;
  }

  #renderMember(member: DiscordCallMember) {
    const name = memberName(member);
    const muted = member.local_mute === true;

    return html`<li class="member">
      ${
        member.user.avatar_url === null
          ? html`<span class="avatar" aria-hidden="true"></span>`
          : html`<img
              class="avatar ${member.speaking ? "speaking" : ""}"
              src=${member.user.avatar_url}
              alt=""
            />`
      }
      <span class="truncate">
        ${name}
        ${
          member.speaking
            ? html`<gw-chip size="small" tone="success">Speaking</gw-chip>`
            : nothing
        }
      </span>
      <gw-button
        variant=${muted ? "danger" : "neutral"}
        appearance="plain"
        labels="hide"
        toggle
        ?pressed=${muted}
        icon=${muted ? mdiVolumeOff : mdiVolumeHigh}
        ?disabled=${this.#busy(`TOGGLE_USER_MUTE:${member.user.id}`)}
        data-action="TOGGLE_USER_MUTE"
        data-user=${member.user.id}
        data-label="Mute ${name}"
        @click=${this.#onButton}
        >Mute ${name} for you</gw-button
      >
      ${this.#level({
        id: `volume-${member.user.id}`,
        label: `Volume for ${name}`,
        action: "SET_USER_VOLUME",
        value: member.volume,
        max: limits.user,
        user: member.user.id,
      })}
    </li>`;
  }

  #renderSounds(discord: DiscordData) {
    const sounds = discord.sounds ?? [];

    if (sounds.length === 0) return nothing;

    const inCall = discord.call !== null;

    const buttons = sounds.map(
      (sound) =>
        html`<gw-button
          variant="neutral"
          appearance="filled"
          size="small"
          ?disabled=${!inCall}
          ?loading=${this.#busy(`PLAY_SOUND:${sound.id}`)}
          data-action="PLAY_SOUND"
          data-sound=${sound.id}
          data-label="Play ${sound.name}"
          @click=${this.#onButton}
          >${
            sound.emoji === null
              ? nothing
              : html`<span slot="icon" aria-hidden="true">${sound.emoji}</span>`
          }${sound.name}</gw-button
        >`,
    );

    return html`
      <gw-card
        level=${this.cardLevel}
        class="wide"
        heading="Soundboard"
        description=${inCall ? "Plays in the call" : "Join a call to play sounds"}
      >
        <div class="sounds" role="group" aria-label="Sounds">${buttons}</div>
      </gw-card>
    `;
  }

  override render() {
    const discord = this.#data.value.discord;

    // Nothing to control until Discord is connected and signed in
    if (discord === undefined || !discord.authenticated) return nothing;

    const result = actionResult(this.#control.value, "");

    return html`
      <div class="page">
        ${this.renderHeader({
          heading: "Controls",
          description: "Change your Discord voice settings and call",
          icon: mdiHeadset,
        })}
        ${
          result?.success === false
            ? this.renderResult({
                success: false,
                message: `${this.sent?.label ?? "That"}: ${result.message}`,
              })
            : nothing
        }
        <div class="grid controls" style="--sb-grid-min: 22rem">
          ${this.#renderVoice(discord)} ${this.#renderAudio(discord)}
          ${this.#renderMode(discord)} ${this.#renderCall(discord)}
          ${this.#renderSounds(discord)}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-discord": PageDiscord;
  }
}
