import { consume } from "@lit/context";
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { z } from "zod";

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
import type { Settings } from "~/lib/system-bridge/types-settings";
import { generateUUID } from "~/lib/utils";
import { PageElement } from "~/mixins/page-element";
import "../components/ui/button";
import "../components/ui/connection-indicator";
import "../components/ui/connection-required";
import "../components/ui/icon";
import "../components/ui/input";
import "../components/ui/label";

const DirectoryValidationSchema = z.object({ valid: z.boolean() });

interface MediaDirectory {
  name: string;
  path: string;
}

@customElement("page-settings-media")
class PageSettingsMedia extends PageElement {
  title = "Media Directories";
  description = "Manage directories for media scanning";

  @consume({ context: bridgeSettingsContext, subscribe: true })
  bridgeSettings?: BridgeSettingsState;

  @consume({ context: connectionStatusContext, subscribe: true })
  status?: ConnectionStatus;

  @consume({ context: websocketActionsContext, subscribe: true })
  actions?: WebSocketActions;

  @consume({ context: connectionContext, subscribe: true })
  connection?: ConnectionSettings;

  @state()
  private mediaDirectories: MediaDirectory[] = [];

  @state()
  private newDirectoryName = "";

  @state()
  private newDirectoryPath = "";

  @state()
  private isValidating = false;

  @state()
  private isSubmitting = false;

  @state()
  private validationError: string | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.loadSettings();
  }

  updated(changedProperties: Map<PropertyKey, unknown>) {
    if (changedProperties.has("bridgeSettings")) {
      this.loadSettings();
    }
  }

  private loadSettings() {
    if (this.bridgeSettings?.settings) {
      this.mediaDirectories = [
        ...this.bridgeSettings.settings.media.directories,
      ];
    }
  }

  private handleNavigateToConnection = (): void => {
    this.navigate("/connection");
  };

  private handleNameInput = (e: InputEvent): void => {
    const input = e.target as HTMLInputElement;
    this.newDirectoryName = input.value;
  };

  private handlePathInput = (e: InputEvent): void => {
    const input = e.target as HTMLInputElement;
    this.newDirectoryPath = input.value;
  };

  // fallow-ignore-next-line complexity
  private handleAddDirectory = async (): Promise<void> => {
    if (
      !this.newDirectoryName.trim() ||
      !this.newDirectoryPath.trim() ||
      !this.connection?.token ||
      !this.actions
    ) {
      return;
    }

    this.validationError = null;
    this.isValidating = true;
    this.requestUpdate();

    try {
      const response = await this.actions.sendRequestWithResponse<{
        valid: boolean;
      }>(
        {
          id: generateUUID(),
          event: "VALIDATE_DIRECTORY",
          data: { path: this.newDirectoryPath },
          token: this.connection.token,
        },
        DirectoryValidationSchema,
      );

      if (response.valid) {
        this.mediaDirectories = [
          ...this.mediaDirectories,
          {
            name: this.newDirectoryName.trim(),
            path: this.newDirectoryPath.trim(),
          },
        ];
        this.saveSettings();
        this.newDirectoryName = "";
        this.newDirectoryPath = "";
      } else {
        this.validationError = "Directory does not exist or is not accessible.";
      }
    } catch (error) {
      console.error("Failed to validate directory:", error);
      this.validationError = "Failed to validate directory.";
    } finally {
      this.isValidating = false;
      this.requestUpdate();
    }
  };

  private handleRemoveDirectory = (e: Event): void => {
    const button = e.currentTarget as HTMLElement;
    const path = button.getAttribute("data-path");
    if (!path) return;

    this.mediaDirectories = this.mediaDirectories.filter(
      (d) => d.path !== path,
    );
    this.saveSettings();
  };

  // fallow-ignore-next-line complexity
  private saveSettings(): void {
    if (
      !this.connection?.token ||
      !this.actions ||
      !this.bridgeSettings?.settings
    ) {
      return;
    }

    this.isSubmitting = true;
    this.requestUpdate();

    try {
      const updatedSettings: Settings = {
        ...this.bridgeSettings.settings,
        media: {
          directories: this.mediaDirectories,
        },
      };

      this.actions.sendRequest({
        id: generateUUID(),
        event: "UPDATE_SETTINGS",
        data: updatedSettings,
        token: this.connection.token,
      });
    } catch (error) {
      console.error("Failed to update media settings:", error);
    } finally {
      this.isSubmitting = false;
      this.requestUpdate();
    }
  }

  private renderDirectoryItem(dir: MediaDirectory) {
    return html`
      <div class="flex items-center gap-4 p-3 rounded-md border">
        <div class="flex-1 space-y-1">
          <div class="font-medium">${dir.name}</div>
          <div class="text-sm text-muted-foreground break-all">${dir.path}</div>
        </div>
        <ui-button
          variant="destructive"
          size="sm"
          data-path=${dir.path}
          @click=${this.handleRemoveDirectory}
          ?disabled=${this.isSubmitting}
        >
          <ui-icon name="Trash2"></ui-icon>
        </ui-button>
      </div>
    `;
  }

  private renderDirectoryList() {
    if (this.mediaDirectories.length === 0) {
      return html`
        <div
          class="text-sm text-muted-foreground italic p-4 text-center border rounded-md"
        >
          No media directories configured
        </div>
      `;
    }

    const directoryItems = this.mediaDirectories.map((dir) =>
      this.renderDirectoryItem(dir),
    );

    return html` <div class="space-y-2">${directoryItems}</div> `;
  }

  // fallow-ignore-next-line complexity
  private renderAddDirectoryForm() {
    return html`
      <div class="rounded-lg border bg-card p-6 space-y-4">
        <h2 class="text-xl font-semibold">Add Directory</h2>
        <p class="text-sm text-muted-foreground">
          Add directories to be used for media scanning. Only existing
          directories are allowed.
        </p>

        <div class="flex gap-2">
          <div class="flex-1">
            <ui-label>Name</ui-label>
            <ui-input
              placeholder="Enter directory name"
              .value=${this.newDirectoryName}
              @input=${this.handleNameInput}
              ?disabled=${this.isValidating || this.isSubmitting}
            ></ui-input>
          </div>
          <div class="flex-1">
            <ui-label>Path</ui-label>
            <ui-input
              placeholder="Enter directory path"
              .value=${this.newDirectoryPath}
              @input=${this.handlePathInput}
              ?disabled=${this.isValidating || this.isSubmitting}
            ></ui-input>
          </div>
          <div class="self-end">
            <ui-button
              variant="secondary"
              @click=${this.handleAddDirectory}
              ?disabled=${this.isValidating ||
              this.isSubmitting ||
              !this.newDirectoryName.trim() ||
              !this.newDirectoryPath.trim()}
            >
              ${this.isValidating ? "Validating..." : "Add"}
            </ui-button>
          </div>
        </div>

        ${this.validationError
          ? html`
              <div class="text-sm text-destructive">
                ${this.validationError}
              </div>
            `
          : ""}
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
            "Please connect to System Bridge to manage media directories.",
            this.handleNavigateToConnection,
            html`
              <div class="space-y-6">
                ${this.renderAddDirectoryForm()}

                <div class="rounded-lg border bg-card p-6 space-y-4">
                  <h2 class="text-xl font-semibold">
                    Directories
                    ${this.mediaDirectories.length > 0
                      ? `(${this.mediaDirectories.length})`
                      : ""}
                  </h2>
                  ${this.renderDirectoryList()}
                </div>
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
    "page-settings-media": PageSettingsMedia;
  }
}
