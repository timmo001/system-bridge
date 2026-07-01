import { consume } from "@lit/context";
import { html, type TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";

import {
  bridgeSettingsContext,
  type BridgeSettingsState,
} from "~/contexts/bridge-settings";
import {
  connectionContext,
  type ConnectionSettings,
} from "~/contexts/connection";
import {
  connectionStatusContext,
  type ConnectionStatus,
} from "~/contexts/connection-status";
import {
  websocketActionsContext,
  type WebSocketActions,
} from "~/contexts/websocket-actions";
import {
  DiskMountsResponseSchema,
  type DiskMountInfo,
  type DiskMountsResponse,
} from "~/lib/system-bridge/types-modules-schemas";
import { generateUUID } from "~/lib/utils";
import { PageElement } from "~/mixins/page-element";
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
class PageSettingsDisks extends PageElement {
  title = "Disk Mounts";
  description = "Configure which disk mounts are reported";

  @consume({ context: bridgeSettingsContext, subscribe: true })
  bridgeSettings?: BridgeSettingsState;

  @consume({ context: connectionStatusContext, subscribe: true })
  status?: ConnectionStatus;

  @consume({ context: websocketActionsContext, subscribe: true })
  actions?: WebSocketActions;

  @consume({ context: connectionContext, subscribe: true })
  connection?: ConnectionSettings;

  @state()
  private mounts: DiskMountsResponse | null = null;

  @state()
  private allowedMountPoints: string[] = [];

  @state()
  private isLoading = false;

  connectedCallback() {
    super.connectedCallback();
    this.loadData();
  }

  updated(changedProperties: Map<PropertyKey, unknown>) {
    if (
      changedProperties.has("bridgeSettings") ||
      changedProperties.has("status")
    ) {
      this.loadData();
    }
  }

  private loadData() {
    this.loadSettings();
    void this.loadMounts();
  }

  // fallow-ignore-next-line complexity
  private loadSettings() {
    if (this.bridgeSettings?.settings) {
      this.allowedMountPoints = [
        ...(this.bridgeSettings.settings.disks?.allowedSecondaryMountPoints ??
          []),
      ];
    }
  }

  // fallow-ignore-next-line complexity
  private async loadMounts() {
    const token = this.connection?.token;
    if (!token || !this.actions || !this.status?.isConnected) {
      return;
    }

    this.isLoading = true;
    this.requestUpdate();

    try {
      this.mounts =
        await this.actions.sendRequestWithResponse<DiskMountsResponse>(
          {
            id: generateUUID(),
            event: "GET_DISK_MOUNTS",
            data: {},
            token,
          },
          DiskMountsResponseSchema,
        );
    } catch (error) {
      console.error("Failed to load disk mounts:", error);
    } finally {
      this.isLoading = false;
      this.requestUpdate();
    }
  }

  private handleToggleMount = (e: Event): void => {
    const el = e.currentTarget as HTMLElement;
    const mountPoint = el.getAttribute("data-mount");
    if (!mountPoint) return;

    if (this.allowedMountPoints.includes(mountPoint)) {
      this.allowedMountPoints = this.allowedMountPoints.filter(
        (mp) => mp !== mountPoint,
      );
    } else {
      this.allowedMountPoints = [...this.allowedMountPoints, mountPoint];
    }
    this.saveSettings();
  };

  // fallow-ignore-next-line complexity
  private saveSettings(): void {
    const token = this.connection?.token;
    if (!token || !this.actions || !this.bridgeSettings?.settings) {
      return;
    }

    this.actions.sendRequest({
      id: generateUUID(),
      event: "UPDATE_SETTINGS",
      data: {
        ...this.bridgeSettings.settings,
        disks: { allowedSecondaryMountPoints: this.allowedMountPoints },
      },
      token,
    });
    this.requestUpdate();
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
    mounts: DiskMountInfo[],
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

  // fallow-ignore-next-line complexity
  private renderContent() {
    if (this.isLoading || !this.mounts) {
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
          this.mounts.primary,
          { disabled: true },
        )}
        ${this.renderSection(
          "Bind Mounts",
          "Subvolume and bind mounts that share storage with a primary device (e.g., btrfs subvolumes).",
          this.mounts.secondary.bind,
        )}
        ${this.renderSection(
          "SquashFS Mounts",
          "Read-only compressed mounts, always 100% full (e.g., snap packages).",
          this.mounts.secondary.squashfs,
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
