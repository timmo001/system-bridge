import { mdiHarddisk } from "@mdi/js";
import type {
  DiskMountInfo,
  DiskMountsResponse,
  Settings,
} from "@timmo001/effect-system-bridge";
import { Option, Struct } from "effect";
import { AsyncResult } from "effect/reactivity";
import { css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";

import "@timmo001/groundwork-ui/gw-card.ts";
import "@timmo001/groundwork-ui/gw-meter.ts";
import { pageStyles, shared } from "~/components/shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import { diskMounts } from "~/lib/atoms";
import { formatBytes } from "~/lib/format";

import { SbSettingsPage } from "./sb-settings-page";

const placeholder = html`<span
  class="skeleton"
  style="min-height: 24rem; border-radius: var(--sb-radius-l)"
></span>`;

/** Which secondary disk mounts the Disks module reports. */
@customElement("page-settings-disks")
export class PageSettingsDisks extends SbSettingsPage {
  static override styles = [
    shared,
    pageStyles,
    css`
      .mount {
        display: flex;
        align-items: center;
        gap: var(--sb-space-4);
        padding: var(--sb-space-3);
        cursor: pointer;
        border-radius: var(--sb-radius-m);
      }

      .mount:hover {
        background: var(--sb-color-hover);
      }

      .mount.locked {
        cursor: default;
      }

      .mount gw-meter {
        flex: 1;
        min-width: 0;
      }
    `,
  ];

  readonly #mounts = new AtomController(this, () => diskMounts);

  @state() private allowed: readonly string[] = [];

  protected readonly pageTitle = "Disk mounts";

  protected settingsLoaded(settings: Settings): void {
    this.allowed = settings.disks.allowedSecondaryMountPoints;
  }

  #toggle(mountPoint: string, on: boolean) {
    const current = this.settings;

    this.allowed = on
      ? [...this.allowed, mountPoint]
      : this.allowed.filter((point) => point !== mountPoint);

    if (current !== undefined) {
      this.saveSettings(
        Struct.assign(current, {
          disks: { allowedSecondaryMountPoints: this.allowed },
        }),
      );
    }
  }

  /** Each checkbox's value is its mount point. */
  #onChange = (event: Event) => {
    if (event.target instanceof HTMLInputElement) {
      this.#toggle(event.target.value, event.target.checked);
    }
  };

  #renderMount(mount: DiskMountInfo, locked: boolean) {
    const checked = locked || this.allowed.includes(mount.mount_point);

    return html`
      <label class="mount ${locked ? "locked" : ""}">
        <input
          class="checkbox"
          type="checkbox"
          .value=${mount.mount_point}
          .checked=${checked}
          ?disabled=${locked || this.isSaving}
          @change=${this.#onChange}
        />
        <gw-meter
          label=${mount.mount_point}
          .value=${mount.usage?.percent ?? undefined}
          display=${
            mount.usage === null
              ? "-"
              : `${formatBytes(mount.usage.used)} of ${formatBytes(mount.usage.total)}`
          }
          caption="${mount.device} · ${mount.filesystem_type}"
          .high=${80}
          .critical=${92}
        ></gw-meter>
      </label>
    `;
  }

  #renderSection(
    heading: string,
    description: string,
    mounts: readonly DiskMountInfo[],
    locked = false,
  ) {
    const rows = mounts.map((mount) => this.#renderMount(mount, locked));

    return rows.length === 0
      ? nothing
      : html`<gw-card
          level=${this.cardLevel}
          heading=${heading}
          description=${description}
        >
          <div>${rows}</div>
        </gw-card>`;
  }

  #renderContent() {
    const mounts: DiskMountsResponse | undefined = Option.getOrUndefined(
      AsyncResult.value(this.#mounts.value),
    );

    if (mounts === undefined) return placeholder;

    return html`
      ${this.#renderSection(
        "Primary mounts",
        "Always reported",
        mounts.primary,
        true,
      )}
      ${this.#renderSection(
        "Bind mounts",
        "Subvolumes and bind mounts that share a primary device, such as btrfs subvolumes",
        mounts.secondary.bind,
      )}
      ${this.#renderSection(
        "SquashFS mounts",
        "Read-only compressed mounts that are always full, such as snaps",
        mounts.secondary.squashfs,
      )}
    `;
  }

  override render() {
    return html`
      <div class="page narrow">
        ${this.renderHeader({
          heading: "Disk mounts",
          description: "Choose which extra mounts the Disks module reports",
          icon: mdiHarddisk,
        })}
        ${this.renderResult(this.saveResult)}
        ${this.gate(() => this.#renderContent(), placeholder)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-settings-disks": PageSettingsDisks;
  }
}
