import { LitElement, html, css } from "lit";

/**
 * Connection settings interface for System Bridge.
 */
export interface ConnectionSettings {
  /** Host address (default: localhost) */
  host: string;
  /** Port number (default: 9170) */
  port: number;
  /** Use SSL/TLS (default: false) */
  ssl: boolean;
  /** Authentication token */
  token: string;
}

/**
 * Mixin that provides connection settings management for System Bridge.
 * 
 * - Parses connection settings from URL query parameters
 * - Provides form UI for manual configuration
 * - Manages connection state and validation
 * - Integrates with websocket client mixin
 */
export function SBConnectionMixin<T extends Constructor<LitElement>>(superClass: T) {
  class SBConnectionElement extends superClass {
    /** Current connection settings */
    connectionSettings: ConnectionSettings = {
      host: "localhost",
      port: 9170,
      ssl: false,
      token: ""
    };

    /** Whether connection settings are valid */
    isConnectionValid = false;

    /** Whether to show the connection form */
    showConnectionForm = false;

    static styles = css`
      .connection-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        padding: 1rem;
        background-color: #f9fafb;
        border-radius: 0.5rem;
        border: 1px solid #e5e7eb;
      }

      .connection-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .connection-status {
        font-weight: 500;
        color: #374151;
      }

      .connection-details {
        font-size: 0.875rem;
        color: #6b7280;
      }

      .connection-actions {
        display: flex;
        gap: 0.5rem;
      }

      button {
        padding: 0.5rem 1rem;
        border: 1px solid #d1d5db;
        border-radius: 0.375rem;
        background-color: white;
        color: #374151;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease-in-out;
      }

      button:hover {
        background-color: #f9fafb;
        border-color: #9ca3af;
      }

      button.primary {
        background-color: #3b82f6;
        color: white;
        border-color: #3b82f6;
      }

      button.primary:hover {
        background-color: #2563eb;
        border-color: #2563eb;
      }

      .connection-form-container {
        margin-top: 1rem;
        padding: 1rem;
        background-color: white;
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
      }
    `;

    /**
     * Initialize connection settings from query parameters or defaults.
     */
    initializeConnectionSettings() {
      const urlParams = new URLSearchParams(window.location.search);
      
      this.connectionSettings = {
        host: urlParams.get("host") || "localhost",
        port: parseInt(urlParams.get("port") || "9170", 10),
        ssl: urlParams.get("ssl") === "true",
        token: urlParams.get("token") || ""
      };

      this.validateConnectionSettings();
    }

    /**
     * Validate current connection settings.
     */
    validateConnectionSettings() {
      this.isConnectionValid = !!(
        this.connectionSettings.host &&
        this.connectionSettings.port > 0 &&
        this.connectionSettings.port <= 65535 &&
        this.connectionSettings.token
      );
    }

    /**
     * Update connection settings and validate.
     */
    updateConnectionSettings(settings: Partial<ConnectionSettings>) {
      this.connectionSettings = { ...this.connectionSettings, ...settings };
      this.validateConnectionSettings();
      this.requestUpdate();
    }

    /**
     * Get the websocket URL based on current settings.
     */
    getWebSocketUrl(): string {
      const protocol = this.connectionSettings.ssl ? "wss" : "ws";
      return `${protocol}://${this.connectionSettings.host}:${this.connectionSettings.port}/api/websocket`;
    }

    /**
     * Show/hide the connection form.
     */
    toggleConnectionForm() {
      this.showConnectionForm = !this.showConnectionForm;
      this.requestUpdate();
    }

    /**
     * Handle settings change from form.
     */
    handleSettingsChange(event: CustomEvent) {
      this.updateConnectionSettings(event.detail.settings);
    }

    /**
     * Handle settings submission from form.
     */
    handleSettingsSubmit(event: CustomEvent) {
      this.updateConnectionSettings(event.detail.settings);
      this.showConnectionForm = false;
    }


    /**
     * Handle settings reset from form.
     */
    handleSettingsReset() {
      this.connectionSettings = {
        host: "localhost",
        port: 9170,
        ssl: false,
        token: ""
      };
      this.validateConnectionSettings();
      this.requestUpdate();
    }

    /**
     * Get connection status display text.
     */
    getConnectionStatusText(): string {
      if (!this.isConnectionValid) {
        return "Invalid settings";
      }
      return `${this.connectionSettings.ssl ? "WSS" : "WS"}://${this.connectionSettings.host}:${this.connectionSettings.port}`;
    }

    /**
     * Render connection header with status and controls.
     */
    renderConnectionHeader() {
      return html`
        <div class="connection-header">
          <div class="connection-info">
            <div class="connection-status">
              ${this.isConnectionValid ? "Ready to connect" : "Configuration needed"}
            </div>
            <div class="connection-details">
              ${this.getConnectionStatusText()}
            </div>
          </div>
          <div class="connection-actions">
            <button @click="${this.toggleConnectionForm}">
              ${this.showConnectionForm ? "Hide Settings" : "Configure"}
            </button>
            ${this.isConnectionValid ? html`
              <button class="primary" @click="${() => this.dispatchEvent(new CustomEvent('connect-requested', { bubbles: true, composed: true }))}">
                Connect
              </button>
            ` : ""}
          </div>
        </div>
      `;
    }

    /**
     * Render connection form.
     */
    renderConnectionForm() {
      if (!this.showConnectionForm) return html``;
      
      return html`
        <div class="connection-form-container">
          <sb-connection-form
            .settings="${this.connectionSettings}"
            @settings-change="${this.handleSettingsChange}"
            @settings-submit="${this.handleSettingsSubmit}"
            @settings-reset="${this.handleSettingsReset}"
          ></sb-connection-form>
        </div>
      `;
    }
  }

  return SBConnectionElement as Constructor<LitElement> & T;
}

/**
 * Constructor type for mixin compatibility.
 */
type Constructor<T = {}> = new (...args: any[]) => T;