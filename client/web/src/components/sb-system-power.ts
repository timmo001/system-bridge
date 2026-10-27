import {
  mdiCoffeeOutline,
  mdiLeaf,
  mdiScaleBalance,
  mdiSleep,
  mdiSpeedometer,
} from "@mdi/js";
import type { SystemData } from "@timmo001/effect-system-bridge";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import "./sb-segmented";
import type { SegmentOption } from "./sb-segmented";
import { shared } from "./shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import {
  actionResult,
  registry,
  setKeepAwake,
  setPowerProfile,
} from "~/lib/atoms";
import { formatDateTime } from "~/lib/format";

/** Names and icons for power-profiles-daemon's usual profiles. */
const knownProfiles = new Map<string, Pick<SegmentOption, "label" | "icon">>([
  ["power-saver", { label: "Power saver", icon: mdiLeaf }],
  ["balanced", { label: "Balanced", icon: mdiScaleBalance }],
  ["performance", { label: "Performance", icon: mdiSpeedometer }],
]);

/** Keeping awake, by how long. Values are seconds, or on and off. */
const keepAwakeOptions: readonly SegmentOption[] = [
  { value: "off", label: "Off", icon: mdiSleep },
  { value: "on", label: "On", icon: mdiCoffeeOutline },
  { value: "1800", label: "30 min" },
  { value: "3600", label: "1 hour" },
  { value: "7200", label: "2 hours" },
];

/** The power profile switch and keeping the system awake, where supported. */
@customElement("sb-system-power")
export class SbSystemPower extends LitElement {
  static override styles = [
    shared,
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--sb-space-4);
      }

      .row {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: var(--sb-space-2);
        text-align: start;
      }

      sb-segmented {
        max-width: 100%;
        overflow-x: auto;
      }
    `,
  ];

  @property({ attribute: false }) system: SystemData | null = null;

  readonly #profile = new AtomController(this, () => setPowerProfile);

  readonly #keepAwake = new AtomController(this, () => setKeepAwake);

  #onProfile = (event: CustomEvent<{ readonly value: string }>) => {
    registry.set(setPowerProfile, event.detail.value);
  };

  #onKeepAwake = (event: CustomEvent<{ readonly value: string }>) => {
    const { value } = event.detail;

    if (value === "off" || value === "on") {
      registry.set(setKeepAwake, { enabled: value === "on" });

      return;
    }

    registry.set(setKeepAwake, { enabled: true, duration: Number(value) });
  };

  #error(result: ReturnType<typeof actionResult>) {
    return result?.success === false
      ? html`<span class="error-text" role="alert">${result.message}</span>`
      : nothing;
  }

  override render() {
    const system = this.system;

    if (!system) return nothing;

    const profiles: readonly SegmentOption[] = system.power_profiles.map(
      (profile) => ({
        value: profile,
        label: knownProfiles.get(profile)?.label ?? profile,
        icon: knownProfiles.get(profile)?.icon,
      }),
    );

    const until = system.keep_awake_until;

    // A timed keep awake shows when it ends rather than which duration was
    // chosen, which the system data doesn't keep
    const keepAwake =
      system.keep_awake === true ? (until === null ? "on" : "") : "off";

    return html`
      ${
        system.power_profile === null || profiles.length === 0
          ? nothing
          : html`<div class="row">
              <span class="small">Power profile</span>
              <sb-segmented
                label="Power profile"
                narrow-icons
                .options=${profiles}
                .value=${system.power_profile}
                @value-changed=${this.#onProfile}
              ></sb-segmented>
              ${this.#error(actionResult(this.#profile.value, ""))}
            </div>`
      }
      ${
        system.keep_awake === null
          ? nothing
          : html`<div class="row">
              <span class="small"
                >Keep
                awake${
                  until === null
                    ? nothing
                    : html`<span class="muted">
                        · until ${formatDateTime(until * 1000)}</span
                      >`
                }</span
              >
              <sb-segmented
                label="Keep awake"
                .options=${keepAwakeOptions}
                .value=${keepAwake}
                @value-changed=${this.#onKeepAwake}
              ></sb-segmented>
              ${this.#error(actionResult(this.#keepAwake.value, ""))}
            </div>`
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-system-power": SbSystemPower;
  }
}
