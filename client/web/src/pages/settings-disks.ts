import type {
  DiskMountInfo,
  DiskMountsResponse,
  Settings,
} from "@timmo001/effect-system-bridge";
import { Option, Struct } from "effect";
import { AsyncResult } from "effect/reactivity";
import { html, type TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";

import { AtomController } from "~/controllers/atom-controller";
import { diskMounts } from "~/lib/atoms";
import { SettingsPageElement } from "~/mixins/settings-page";
import "../components/ui/button";
import "../components/ui/checkbox";
import "../components/ui/connection-indicator";
import "../components/ui/connection-required";
import "../components/ui/icon";
import "../components/ui/label";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

@customElement("page-settings-disks")
class PageSettingsDisks extends SettingsPageElement {
  title = "Disk Mounts";
  description = "Configure which disk mounts are reported";

  readonly #mounts = new AtomController(this, () => diskMounts);

  @state()
  private allowedMountPoints: readonly string[] = [];

  private get mounts(): DiskMountsResponse | undefined {
    return Option.getOrUndefined(AsyncResult.value(this.#mounts.value));
  }

  protected settingsLoaded(settings: Settings): void {
    this.allowedMountPoints = settings.disks.allowedSecondaryMountPoints;
  }

  private handleToggleMount = (
    e: Event & { currentTarget: HTMLElement },
  ): void => {
    const mountPoint = e.currentTarget.getAttribute("data-mount");

    if (!mountPoint) return;

    if (this.allowedMountPoints.includes(mountPoint)) {
      this.allowedMountPoints = this.allowedMountPoints.filter(
        (mp) => mp !== mountPoint,
      );
    } else {
      this.allowedMountPoints = [...this.allowedMountPoints, mountPoint];
    }

    this.saveDisks();
  };

  private saveDisks(): void {
    const current = this.settings;

    if (!current) return;

    this.saveSettings(
      Struct.assign(current, {
        disks: { allowedSecondaryMountPoints: this.allowedMountPoints },
      }),
    );
  }

  private handleNavigateToConnection = (): void => {
    this.navigate("/connection");
  };

  private renderMountRow(
    mount: DiskMountInfo,
    options: { disabled?: boolean; checked?: boolean } = {},
  ) {
    const { disabled = false, checked = false } = options;

    const usageText = mount.usage
      ? `${mount.usage.percent.toFixed(1)}% (${formatBytes(mount.usage.used)} / ${formatBytes(mount.usage.total)})`
      : "N/A";

    return html`
      <label
        class="flex items-center gap-4 p-3 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors ${
          disabled ? "opacity-75" : ""
        }"
      >
        <ui-checkbox
          .checked=${checked}
          ?disabled=${disabled}
          data-mount=${mount.mount_point}
          @checkbox-change=${this.handleToggleMount}
        ></ui-checkbox>
        <div class="flex-1 min-w-0">
          <div class="font-medium font-mono text-sm truncate">
            ${mount.mount_point}
          </div>
          <div class="text-xs text-muted-foreground truncate">
            ${mount.device} &middot; ${mount.filesystem_type}
          </div>
        </div>
        <div class="text-sm text-muted-foreground whitespace-nowrap">
          ${usageText}
        </div>
      </label>
    `;
  }

  private renderSection(
    title: string,
    description: string,
    mounts: readonly DiskMountInfo[],
    options: { disabled?: boolean } = {},
  ): TemplateResult {
    const { disabled = false } = options;

    if (mounts.length === 0) {
      return html``;
    }

    const mountRows = mounts.map((mount) =>
      this.renderMountRow(mount, {
        disabled,
        checked:
          disabled || this.allowedMountPoints.includes(mount.mount_point),
      }),
    );

    return html`
      <div class="rounded-lg border bg-card p-6 space-y-4">
        <div class="space-y-1">
          <h2 class="text-lg font-semibold">${title}</h2>
          <p class="text-sm text-muted-foreground">${description}</p>
        </div>
        <div class="space-y-2">${mountRows}</div>
      </div>
    `;
  }

  private renderContent() {
    const mounts = this.mounts;

    if (!mounts) {
      return html`
        <div class="text-sm text-muted-foreground italic p-4 text-center">
          Loading disk mounts...
        </div>
      `;
    }

    return html`
      <div class="space-y-6">
        ${this.renderSection(
          "Primary Mounts",
          "These mounts are always reported. They cannot be disabled.",
          mounts.primary,
          { disabled: true },
        )}
        ${this.renderSection(
          "Bind Mounts",
          "Subvolume and bind mounts that share storage with a primary device (e.g., btrfs subvolumes).",
          mounts.secondary.bind,
        )}
        ${this.renderSection(
          "SquashFS Mounts",
          "Read-only compressed mounts, always 100% full (e.g., snap packages).",
          mounts.secondary.squashfs,
        )}
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
            "Please connect to System Bridge to manage disk mount settings.",
            this.handleNavigateToConnection,
            this.renderContent(),
          )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-settings-disks": PageSettingsDisks;
  }
}
