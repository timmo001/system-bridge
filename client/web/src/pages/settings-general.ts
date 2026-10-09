import { LogLevel, type Settings } from "@timmo001/effect-system-bridge";
import { Schema, Struct } from "effect";
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";

import { SettingsPageElement } from "~/mixins/settings-page";
import "../components/ui/button";
import "../components/ui/connection-indicator";
import "../components/ui/connection-required";
import "../components/ui/icon";
import "../components/ui/input";
import "../components/ui/label";
import "../components/ui/switch";

const isLogLevel = Schema.is(LogLevel);

@customElement("page-settings-general")
class PageSettingsGeneral extends SettingsPageElement {
  title = "General Settings";
  description = "Configure your System Bridge general settings";

  @state()
  private formData: Settings = {
    autostart: false,
    systemTray: true,
    hotkeys: [],
    logLevel: "INFO",
    commands: {
      allowlist: [],
    },
    disks: {
      allowedSecondaryMountPoints: [],
    },
    media: {
      directories: [],
    },
  };

  private get isSubmitting(): boolean {
    return this.isSaving;
  }

  private _formElement: HTMLFormElement | null = null;

  disconnectedCallback() {
    super.disconnectedCallback();

    // Remove form event listener if it exists
    if (this._formElement) {
      this._formElement.removeEventListener("submit", this.handleSubmit);
      this._formElement = null;
    }
  }

  updated() {
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

  protected settingsLoaded(settings: Settings): void {
    this.formData = settings;
  }

  private handleSubmit = (e: Event): void => {
    e.preventDefault();

    // Read current form values to ensure we have the latest data
    const selectElement = this._formElement?.querySelector("select");

    if (selectElement) this.setLogLevel(selectElement.value);

    this.saveSettings(this.formData);
  };

  private handleAutostartChange = (
    e: CustomEvent<{ checked: boolean }>,
  ): void => {
    this.formData = Struct.assign(this.formData, {
      autostart: e.detail.checked,
    });
  };

  private setLogLevel(value: string): void {
    if (isLogLevel(value)) {
      this.formData = Struct.assign(this.formData, { logLevel: value });
    }
  }

  private handleLogLevelChange = (
    e: Event & { target: HTMLSelectElement },
  ): void => {
    this.setLogLevel(e.target.value);
  };

  private handleSystemTrayChange = (e: CustomEvent<{ checked: boolean }>) => {
    this.formData = Struct.assign(this.formData, {
      systemTray: e.detail.checked,
    });
  };

  private handleNavigateToConnection = (): void => {
    this.navigate("/connection");
  };

  private renderSettingsForm() {
    return html`
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

          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <ui-label>System tray</ui-label>
              <p class="text-sm text-muted-foreground">
                Show the System Bridge tray icon. Hiding takes effect when you
                save. After re-enabling, save and restart System Bridge. On
                macOS, hiding the icon also requires a restart.
              </p>
            </div>
            <ui-switch
              aria-label="System tray"
              .checked=${this.formData.systemTray}
              ?disabled=${this.isSubmitting}
              @switch-change=${this.handleSystemTrayChange}
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
            "Please connect to System Bridge to manage settings.",
            this.handleNavigateToConnection,
            this.renderSettingsForm(),
          )}
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
