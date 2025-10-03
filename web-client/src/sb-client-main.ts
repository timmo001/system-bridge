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

    .homepage-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }

    .homepage-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .homepage-title {
      font-size: 2.5rem;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 0.5rem;
    }

    .homepage-subtitle {
      font-size: 1.125rem;
      color: #6b7280;
      margin-bottom: 2rem;
    }

    .connection-summary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 1rem;
      padding: 2rem;
      margin-bottom: 2rem;
      color: white;
    }

    .summary-title {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 1rem;
      text-align: center;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .summary-item {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 0.5rem;
      padding: 1rem;
      text-align: center;
    }

    .summary-label {
      font-size: 0.875rem;
      opacity: 0.8;
      margin-bottom: 0.5rem;
    }

    .summary-value {
      font-size: 1.125rem;
      font-weight: 600;
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
      margin-right: 0.5rem;
    }

    .status-indicator.connected {
      background-color: #10b981;
    }

    .status-indicator.disconnected {
      background-color: #ef4444;
    }

    .navigation-section {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .nav-button {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem 2rem;
      background-color: #3b82f6;
      color: white;
      text-decoration: none;
      border-radius: 0.75rem;
      font-weight: 600;
      font-size: 1rem;
      transition: all 0.2s ease;
      border: none;
      cursor: pointer;
      min-width: 150px;
      justify-content: center;
    }

    .nav-button:hover {
      background-color: #2563eb;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }

    .nav-button:active {
      transform: translateY(0);
    }

    .nav-button.secondary {
      background-color: #6b7280;
    }

    .nav-button.secondary:hover {
      background-color: #4b5563;
      box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3);
    }

    .nav-icon {
      width: 20px;
      height: 20px;
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

    @media (max-width: 640px) {
      .homepage-container {
        padding: 1rem;
      }
      
      .homepage-title {
        font-size: 2rem;
      }
      
      .navigation-section {
        flex-direction: column;
        align-items: center;
      }
      
      .nav-button {
        width: 100%;
        max-width: 300px;
      }
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
      <div class="homepage-container">
        <div class="homepage-header">
          <h1 class="homepage-title">System Bridge</h1>
          <p class="homepage-subtitle">Connect and monitor your system data</p>
        </div>

        <div class="connection-summary">
          <h2 class="summary-title">Connection Status</h2>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">Status</div>
              <div class="summary-value">
                <span class="status-indicator ${this.isConnected ? 'connected' : 'disconnected'}"></span>
                ${this.isConnected ? "Connected" : "Disconnected"}
              </div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Host</div>
              <div class="summary-value">${(this as any).connectionSettings?.host || 'localhost'}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Port</div>
              <div class="summary-value">${(this as any).connectionSettings?.port || '9170'}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Protocol</div>
              <div class="summary-value">${(this as any).connectionSettings?.ssl ? 'WSS' : 'WS'}</div>
            </div>
          </div>
        </div>

        <div class="navigation-section">
          <a href="/data" class="nav-button">
            <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
            View Data
          </a>
          <a href="/settings" class="nav-button secondary">
            <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            Settings
          </a>
        </div>

        ${!this.isConnected ? html`
          <div class="status-section">
            <h3>Connection Required</h3>
            <p>Please configure your connection settings to view system data.</p>
            ${(this as any).renderConnectionForm()}
          </div>
        ` : ""}
        
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
