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
import "../components/ui/switch";

@customElement("page-settings-general")
export class PageSettingsGeneral extends PageElement {
  title = "General Settings";
  description = "Configure your System Bridge general settings";

  @consume({ context: websocketContext, subscribe: true })
  websocket?: WebSocketState;

  @consume({ context: connectionContext, subscribe: true })
  connection?: ConnectionSettings;

  @state()
  private formData: Settings = {
    autostart: false,
    hotkeys: [],
    logLevel: "INFO",
    commands: {
      allowlist: [],
    },
    media: {
      directories: [],
    },
  };

  @state()
  private isSubmitting = false;

  private _formElement: HTMLFormElement | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.loadSettings();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Remove form event listener if it exists
    if (this._formElement) {
      this._formElement.removeEventListener("submit", this.handleSubmit);
      this._formElement = null;
    }
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
      this._formElement = form;
    }
  }

  private loadSettings() {
    if (this.websocket?.settings) {
      this.formData = { ...this.websocket.settings };
      this.requestUpdate();
    }
  }

  private handleSubmit = (e: Event): void => {
    e.preventDefault();

    if (!this.connection?.token) {
      return;
    }

    if (!this.websocket?.sendRequest) {
      return;
    }

    // Read current form values to ensure we have the latest data
    const form = e.target as HTMLFormElement;
    const selectElement = form.querySelector("select")!;
    if (selectElement) {
      this.formData = {
        ...this.formData,
        logLevel: selectElement.value as Settings["logLevel"],
      };
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
    } catch (error) {
      console.error("Failed to update general settings:", error);
    } finally {
      this.isSubmitting = false;
      this.requestUpdate();
    }
  };

  private handleAutostartChange = (
    e: CustomEvent<{ checked: boolean }>
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

  render() {
    const isConnected = this.websocket?.isConnected ?? false;

    return html`
      <div class="min-h-screen bg-background text-foreground p-8">
        <div class="max-w-4xl mx-auto space-y-6">
          ${this.renderPageHeader()}
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
                        @blur=${this.handleLogLevelChange}
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
    "page-settings-general": PageSettingsGeneral;
  }
}
