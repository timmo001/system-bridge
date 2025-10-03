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
  /** Authentication API key */
  apiKey: string;
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
      apiKey: ""
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
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .connection-status-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: #9ca3af;
      }

      .connection-status-indicator.valid {
        background-color: #10b981;
      }

      .connection-status-indicator.invalid {
        background-color: #ef4444;
      }

      .connection-details {
        font-size: 0.875rem;
        color: #6b7280;
      }

      .connection-details-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 0.5rem;
        margin-top: 0.5rem;
      }

      .connection-detail-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .connection-detail-label {
        font-size: 0.75rem;
        font-weight: 500;
        color: #9ca3af;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .connection-detail-value {
        font-size: 0.875rem;
        color: #374151;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        background-color: #f3f4f6;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        border: 1px solid #e5e7eb;
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
     * Save connection settings to session storage.
     */
    private saveConnectionSettingsToSession() {
      try {
        sessionStorage.setItem('system-bridge-connection', JSON.stringify(this.connectionSettings));
      } catch (error) {
        console.warn('Failed to save connection settings to session storage:', error);
      }
    }

    /**
     * Load connection settings from session storage.
     */
    private loadConnectionSettingsFromSession(): ConnectionSettings | null {
      try {
        const stored = sessionStorage.getItem('system-bridge-connection');
        if (stored) {
          return JSON.parse(stored) as ConnectionSettings;
        }
      } catch (error) {
        console.warn('Failed to load connection settings from session storage:', error);
      }
      return null;
    }

    /**
     * Initialize connection settings from query parameters, session storage, or defaults.
     */
    initializeConnectionSettings() {
      const urlParams = new URLSearchParams(window.location.search);
      
      // First try URL parameters
      const urlSettings: Partial<ConnectionSettings> = {};
      if (urlParams.get("host")) urlSettings.host = urlParams.get("host")!;
      if (urlParams.get("port")) urlSettings.port = parseInt(urlParams.get("port")!, 10);
      if (urlParams.get("ssl")) urlSettings.ssl = urlParams.get("ssl") === "true";
      if (urlParams.get("apiKey")) urlSettings.apiKey = urlParams.get("apiKey")!;

      // If URL has any parameters, use them and save to session storage
      if (Object.keys(urlSettings).length > 0) {
        this.connectionSettings = {
          host: "localhost",
          port: 9170,
          ssl: false,
          apiKey: "",
          ...urlSettings
        };
        this.saveConnectionSettingsToSession();
      } else {
        // No URL parameters, try to load from session storage
        const sessionSettings = this.loadConnectionSettingsFromSession();
        if (sessionSettings) {
          this.connectionSettings = sessionSettings;
        } else {
          // Fall back to defaults
          this.connectionSettings = {
            host: "localhost",
            port: 9170,
            ssl: false,
            apiKey: ""
          };
        }
      }

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
        this.connectionSettings.apiKey
      );
    }

    /**
     * Update connection settings and validate.
     */
    updateConnectionSettings(settings: Partial<ConnectionSettings>) {
      this.connectionSettings = { ...this.connectionSettings, ...settings };
      this.validateConnectionSettings();
      this.saveConnectionSettingsToSession();
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
        apiKey: ""
      };
      this.validateConnectionSettings();
      this.saveConnectionSettingsToSession();
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
     * Get detailed connection information for display.
     */
    getConnectionDetails(): { label: string; value: string; type: string }[] {
      return [
        {
          label: "Host",
          value: this.connectionSettings.host,
          type: "text"
        },
        {
          label: "Port", 
          value: this.connectionSettings.port.toString(),
          type: "number"
        },
        {
          label: "Protocol",
          value: this.connectionSettings.ssl ? "WSS (Secure)" : "WS (Unsecure)",
          type: "text"
        },
        {
          label: "API Key",
          value: this.connectionSettings.apiKey ? "••••••••" : "Not set",
          type: "password"
        }
      ];
    }

    /**
     * Render connection header with status and controls.
     */
    renderConnectionHeader() {
      const details = this.getConnectionDetails();
      
      return html`
        <div class="connection-header">
          <div class="connection-info">
            <div class="connection-status">
              <div class="connection-status-indicator ${this.isConnectionValid ? 'valid' : 'invalid'}"></div>
              ${this.isConnectionValid ? "Ready to connect" : "Configuration needed"}
            </div>
            <div class="connection-details">
              ${this.getConnectionStatusText()}
            </div>
            <div class="connection-details-grid">
              ${details.map(detail => html`
                <div class="connection-detail-item">
                  <div class="connection-detail-label">${detail.label}</div>
                  <div class="connection-detail-value">${detail.value}</div>
                </div>
              `)}
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