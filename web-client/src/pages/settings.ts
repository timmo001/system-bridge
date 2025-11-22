import { consume } from "@lit/context";
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";

import {
  connectionContext,
  type ConnectionSettings,
} from "~/contexts/connection";
import { websocketContext, type WebSocketState } from "~/contexts/websocket";
import { showSuccess, showError } from "~/lib/notifications";
import type { Settings } from "~/lib/system-bridge/types-settings";
import { generateUUID } from "~/lib/utils";
import { PageElement } from "~/mixins";
import "../components/ui/button";
import "../components/ui/input";
import "../components/ui/label";
import "../components/ui/switch";

@customElement("page-settings")
export class PageSettings extends PageElement {
  @consume({ context: websocketContext, subscribe: true })
  websocket?: WebSocketState;

  @consume({ context: connectionContext, subscribe: true })
  connection?: ConnectionSettings;

  @state()
  private formData: Settings = {
    autostart: false,
    hotkeys: [],
    logLevel: "INFO",
    media: {
      directories: [],
    },
  };

  @state()
  private isSubmitting = false;

  connectedCallback() {
    super.connectedCallback();
    this.loadSettings();
  }

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has("websocket")) {
      this.loadSettings();
    }
  }

  private loadSettings() {
    if (this.websocket?.settings) {
      this.formData = { ...this.websocket.settings };
      this.requestUpdate();
    }
  }

  private async handleSubmit(e: Event) {
    e.preventDefault();

    if (!this.connection?.token) {
      console.error("No token found");
      return;
    }

    if (!this.websocket?.sendRequest) {
      console.error("WebSocket not available");
      return;
    }

    this.isSubmitting = true;
    this.requestUpdate();

    try {
      this.websocket.sendRequest({
        id: generateUUID(),
        event: "UPDATE_SETTINGS",
        data: this.formData,
        token: this.connection.token,
      });
      showSuccess("Settings update requested!");
    } catch (error) {
      showError("Failed to update settings");
      console.error(error);
    } finally {
      this.isSubmitting = false;
      this.requestUpdate();
    }
  }

  render() {
    const isConnected = this.websocket?.isConnected ?? false;
    const error = this.websocket?.error;

    return html`
      <div class="min-h-screen bg-background text-foreground p-8">
        <div class="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 class="text-3xl font-bold mb-2">Settings</h1>
            <p class="text-muted-foreground">
              Configure your System Bridge settings
            </p>
          </div>

          ${!isConnected
            ? html`
                <div
                  class="rounded-lg border border-destructive bg-destructive/10 p-6"
                >
                  <h3 class="text-lg font-semibold text-destructive mb-2">
                    Not Connected
                  </h3>
                  <p class="text-sm text-destructive/90 mb-4">
                    ${error ||
                    "Please connect to System Bridge to manage settings."}
                  </p>
                  <ui-button
                    variant="default"
                    @click=${() => this.navigate("/connection")}
                  >
                    Configure Connection
                  </ui-button>
                </div>
              `
            : html`
                <form @submit=${this.handleSubmit} class="space-y-8">
                  <div class="rounded-lg border bg-card p-6 space-y-6">
                    <h2 class="text-xl font-semibold">General Settings</h2>

                    <div class="flex items-center justify-between">
                      <div class="space-y-0.5">
                        <ui-label>Autostart</ui-label>
                        <p class="text-sm text-muted-foreground">
                          Start System Bridge automatically on system boot
                        </p>
                      </div>
                      <ui-switch
                        .checked=${this.formData.autostart}
                        ?disabled=${this.isSubmitting}
                        @switch-change=${(e: CustomEvent) => {
                          this.formData.autostart = e.detail.checked;
                          this.requestUpdate();
                        }}
                      ></ui-switch>
                    </div>

                    <div class="space-y-2">
                      <ui-label>Log Level</ui-label>
                      <select
                        class="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        ?disabled=${this.isSubmitting}
                        .value=${this.formData.logLevel}
                        @change=${(e: Event) => {
                          this.formData.logLevel = (
                            e.target as HTMLSelectElement
                          ).value as any;
                          this.requestUpdate();
                        }}
                      >
                        <option value="DEBUG">Debug</option>
                        <option value="INFO">Info</option>
                        <option value="WARN">Warning</option>
                        <option value="ERROR">Error</option>
                      </select>
                      <p class="text-sm text-muted-foreground">
                        Set the logging level for the application
                      </p>
                    </div>
                  </div>

                  <div class="rounded-lg border bg-card p-6 space-y-4">
                    <h2 class="text-xl font-semibold">Media Directories</h2>
                    <p class="text-sm text-muted-foreground">
                      Manage media directories for System Bridge. Currently
                      showing ${this.formData.media.directories.length}
                      director${this.formData.media.directories.length === 1
                        ? "y"
                        : "ies"}.
                    </p>

                    ${this.formData.media.directories.length > 0
                      ? html`
                          <div class="space-y-2">
                            ${this.formData.media.directories.map(
                              (dir) => html`
                                <div
                                  class="flex items-center gap-4 p-3 rounded-md border"
                                >
                                  <div class="flex-1">
                                    <div class="font-medium">${dir.name}</div>
                                    <div class="text-sm text-muted-foreground">
                                      ${dir.path}
                                    </div>
                                  </div>
                                </div>
                              `,
                            )}
                          </div>
                        `
                      : html`
                          <div
                            class="text-sm text-muted-foreground italic p-4 text-center border rounded-md"
                          >
                            No media directories configured
                          </div>
                        `}
                  </div>

                  <div class="flex gap-4">
                    <ui-button
                      type="submit"
                      variant="default"
                      ?disabled=${this.isSubmitting}
                    >
                      ${this.isSubmitting ? "Saving..." : "Save Settings"}
                    </ui-button>
                    <ui-button
                      type="button"
                      variant="outline"
                      ?disabled=${this.isSubmitting}
                      @click=${() => this.navigate("/")}
                    >
                      Back to Home
                    </ui-button>
                  </div>
                </form>
              `}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-settings": PageSettings;
  }
}
