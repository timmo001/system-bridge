import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { WSClientMixin } from "./ws-client-mixin";
import { SBConnectionMixin } from "./sb-connection-mixin";

/**
 * Main System Bridge client element with websocket and connection functionality.
 *
 * - Combines websocket client mixin with connection settings management.
 * - Provides connection configuration UI and query parameter parsing.
 * - Auto-connects when valid settings are available.
 * - Consumers can call mixin APIs directly (e.g. `connect`, `send`,
 *   `registerDataListener`, `getData`).
 */
@customElement("sb-client-main")
export class SBClientMain extends SBConnectionMixin(WSClientMixin(LitElement)) {
  /** Auth API key used for websocket requests. Set via `apiKey` attribute. */
  @property({ type: String, attribute: "apiKey" }) wsApiKey = "";

  static styles = css`
    :host {
      display: block;
    }

    .status-section {
      margin-top: 1rem;
      padding: 1rem;
      background-color: #f9fafb;
      border-radius: 0.5rem;
      border: 1px solid #e5e7eb;
    }

    .status-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .status-item:last-child {
      margin-bottom: 0;
    }

    .status-label {
      font-weight: 500;
      color: #374151;
    }

    .status-value {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 0.875rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      background-color: white;
      border: 1px solid #e5e7eb;
    }

    .status-value.connected {
      color: #065f46;
      background-color: #d1fae5;
      border-color: #a7f3d0;
    }

    .status-value.disconnected {
      color: #991b1b;
      background-color: #fee2e2;
      border-color: #fca5a5;
    }

    .status-value {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .status-indicator {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .status-indicator.connected {
      background-color: #10b981;
    }

    .status-indicator.disconnected {
      background-color: #ef4444;
    }
  `;

  firstUpdated() {
    // Initialize connection settings from query params or apiKey attribute
    (this as any).initializeConnectionSettings();
    
    // If apiKey is provided via attribute, use it
    if (this.wsApiKey) {
      (this as any).updateConnectionSettings({ apiKey: this.wsApiKey });
    }

    // Sync the apiKey from connection settings to wsApiKey
    this.wsApiKey = (this as any).connectionSettings.apiKey;

    // Auto-connect if settings are valid
    if ((this as any).isConnectionValid) {
      this.connect();
    }

    // Listen for connect requests from the connection header
    this.addEventListener('connect-requested', () => {
      this.connect();
    });
  }

  /**
   * Override connect to use connection settings URL.
   */
  connect() {
    if ((this as any).isConnectionValid) {
      // Sync the apiKey from connection settings to wsApiKey
      this.wsApiKey = (this as any).connectionSettings.apiKey;
      
      // Update the websocket URL based on connection settings
      const wsUrl = (this as any).getWebSocketUrl();
      this.setWebSocketUrl(wsUrl);
      super.connect();
    }
  }

  render() {
    return html`
      <div>
        <h1>System Bridge Client</h1>
        ${(this as any).renderConnectionHeader()}
        ${(this as any).renderConnectionForm()}
        <div class="status-section">
          <div class="status-item">
            <span class="status-label">WebSocket:</span>
            <span class="status-value ${this.isConnected ? 'connected' : 'disconnected'}">
              <div class="status-indicator ${this.isConnected ? 'connected' : 'disconnected'}"></div>
              ${this.isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
          ${this.isConnected ? html`
            <div class="status-item">
              <span class="status-label">URL:</span>
              <span class="status-value">${(this as any).getWebSocketUrl()}</span>
            </div>
          ` : ""}
        </div>
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-client-main": SBClientMain;
  }
}
