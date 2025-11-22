import { consume } from "@lit/context";
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";

import {
  connectionContext,
  type ConnectionSettings,
} from "~/contexts/connection";
import { websocketContext, type WebSocketState } from "~/contexts/websocket";
import { showError, showSuccess } from "~/lib/notifications";
import type { Settings } from "~/lib/system-bridge/types-settings";
import { generateUUID } from "~/lib/utils";
import { PageElement } from "~/mixins";
import "../components/ui/button";
import "../components/ui/connection-indicator";
import "../components/ui/connection-required";
import "../components/ui/icon";
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

  private mediaDirectories: { name: string; path: string }[] = [];

  connectedCallback() {
    super.connectedCallback();
    this.loadSettings();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Event listener cleanup is handled automatically since we use querySelector each time
  }

  updated(changedProperties: Map<PropertyKey, unknown>) {
    if (changedProperties.has("websocket")) {
      this.loadSettings();
    }
    // Attach submit handler after render (light DOM workaround)
    this.attachFormHandler();
  }

  private attachFormHandler() {
    const form = this.querySelector("form");
    if (form && !form.dataset.handlerAttached) {
      form.dataset.handlerAttached = "true";
      form.addEventListener("submit", this.handleSubmit);
    }
  }

  private loadSettings() {
    if (this.websocket?.settings) {
      this.formData = { ...this.websocket.settings };
      this.mediaDirectories = [...this.formData.media.directories];
      this.requestUpdate();
    }
  }

  private handleSubmit = (e: Event): void => {
    e.preventDefault();

    if (!this.connection?.token) {
      showError("No token found");
      return;
    }

    if (!this.websocket?.sendRequest) {
      showError("WebSocket not available");
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
    } catch {
      showError("Failed to update settings");
    } finally {
      this.isSubmitting = false;
      this.requestUpdate();
    }
  };

  private handleAutostartChange = (
    e: CustomEvent<{ checked: boolean }>,
  ): void => {
    this.formData = { ...this.formData, autostart: e.detail.checked };
  };

  private handleLogLevelChange = (e: Event): void => {
    const select = e.target as HTMLSelectElement;
    this.formData = {
      ...this.formData,
      logLevel: select.value as Settings["logLevel"],
    };
  };

  private handleNavigateToConnection = (): void => {
    this.navigate("/connection");
  };

  private handleNavigateToHome = (): void => {
    this.navigate("/");
  };

  private renderMediaDirectories() {
    return this.mediaDirectories.map(
      (dir) => html`
        <div class="flex items-center gap-4 p-3 rounded-md border">
          <div class="flex-1">
            <div class="font-medium">${dir.name}</div>
            <div class="text-sm text-muted-foreground">${dir.path}</div>
          </div>
        </div>
      `,
    );
  }

  render() {
    const isConnected = this.websocket?.isConnected ?? false;
    const error = this.websocket?.error;

    return html`
      <div class="min-h-screen bg-background text-foreground p-8">
        <div class="max-w-4xl mx-auto space-y-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <ui-button
                variant="ghost"
                size="icon"
                @click=${this.handleNavigateToHome}
                aria-label="Back to home"
              >
                <ui-icon name="ArrowLeft"></ui-icon>
              </ui-button>
              <div>
                <h1 class="text-3xl font-bold mb-2">Settings</h1>
                <p class="text-muted-foreground">
                  Configure your System Bridge settings
                </p>
              </div>
            </div>
            <ui-connection-indicator></ui-connection-indicator>
          </div>

          ${!isConnected
            ? html`
                <ui-connection-required
                  message="Please connect to System Bridge to manage settings."
                  @configure-connection=${this.handleNavigateToConnection}
                ></ui-connection-required>
              `
            : html`
                <form class="space-y-8">
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
                        @switch-change=${this.handleAutostartChange}
                      ></ui-switch>
                    </div>

                    <div class="space-y-2">
                      <ui-label>Log Level</ui-label>
                      <select
                        class="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        ?disabled=${this.isSubmitting}
                        .value=${this.formData.logLevel}
                        @change=${this.handleLogLevelChange}
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
                      showing ${this.mediaDirectories.length}
                      director${this.mediaDirectories.length === 1
                        ? "y"
                        : "ies"}.
                    </p>

                    ${this.mediaDirectories.length > 0
                      ? html`
                          <div class="space-y-2">
                            ${this.renderMediaDirectories()}
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
