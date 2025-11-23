import { consume } from "@lit/context";
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";

import {
  connectionContext,
  type ConnectionSettings,
} from "~/contexts/connection";
import { websocketContext, type WebSocketState } from "~/contexts/websocket";
import type { Settings } from "~/lib/system-bridge/types-settings";
import { generateUUID } from "~/lib/utils";
import { PageElement } from "~/mixins";
import "../components/ui/button";
import "../components/ui/connection-indicator";
import "../components/ui/connection-required";
import "../components/ui/icon";
import "../components/ui/input";
import "../components/ui/label";

interface MediaDirectory {
  name: string;
  path: string;
}

@customElement("page-settings-media")
export class PageSettingsMedia extends PageElement {
  title = "Media Directories";
  description = "Manage directories for media scanning";

  @consume({ context: websocketContext, subscribe: true })
  websocket?: WebSocketState;

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
    if (changedProperties.has("websocket")) {
      this.loadSettings();
    }
  }

  private loadSettings() {
    if (this.websocket?.settings) {
      this.mediaDirectories = [...this.websocket.settings.media.directories];
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

  private handleAddDirectory = async (): Promise<void> => {
    if (!this.newDirectoryName.trim() || !this.newDirectoryPath.trim()) {
      return;
    }

    if (!this.connection?.token) {
      return;
    }

    if (!this.websocket?.sendRequestWithResponse) {
      return;
    }

    this.validationError = null;
    this.isValidating = true;
    this.requestUpdate();

    try {
      const response = await this.websocket.sendRequestWithResponse<{
        valid: boolean;
      }>(
        {
          id: generateUUID(),
          event: "VALIDATE_DIRECTORY",
          data: { path: this.newDirectoryPath },
          token: this.connection.token,
        },
        // Simple validation schema
        {
          parse: (data: unknown) => {
            if (
              typeof data === "object" &&
              data !== null &&
              "valid" in data &&
              typeof (data as { valid: unknown }).valid === "boolean"
            ) {
              return data as { valid: boolean };
            }
            throw new Error("Invalid response");
          },
          safeParse: (data: unknown) => {
            try {
              return {
                success: true as const,
                data: {
                  parse: (d: unknown) => d,
                  safeParse: () => ({ success: true as const, data: data }),
                }.parse(data) as { valid: boolean },
              };
            } catch (error) {
              return { success: false as const, error };
            }
          },
        } as never
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
      (d) => d.path !== path
    );
    this.saveSettings();
  };

  private saveSettings(): void {
    if (!this.connection?.token) {
      return;
    }

    if (!this.websocket?.sendRequest || !this.websocket?.settings) {
      return;
    }

    this.isSubmitting = true;
    this.requestUpdate();

    try {
      const updatedSettings: Settings = {
        ...this.websocket.settings,
        media: {
          directories: this.mediaDirectories,
        },
      };

      this.websocket.sendRequest({
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
      this.renderDirectoryItem(dir)
    );

    return html` <div class="space-y-2">${directoryItems}</div> `;
  }

  render() {
    const isConnected = this.websocket?.isConnected ?? false;

    return html`
      <div class="min-h-screen bg-background text-foreground p-8">
        <div class="max-w-4xl mx-auto space-y-6">
          ${this.renderPageHeader()}
          ${!isConnected
            ? html`
                <ui-connection-required
                  message="Please connect to System Bridge to manage media directories."
                  @configure-connection=${this.handleNavigateToConnection}
                ></ui-connection-required>
              `
            : html`
                <div class="space-y-6">
                  <div class="rounded-lg border bg-card p-6 space-y-4">
                    <h2 class="text-xl font-semibold">Add Directory</h2>
                    <p class="text-sm text-muted-foreground">
                      Add directories to be used for media scanning. Only
                      existing directories are allowed.
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
              `}
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
