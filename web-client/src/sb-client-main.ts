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
  /** Auth token used for websocket requests. Set via `token` attribute. */
  @property({ type: String, attribute: "token" }) wsToken = "";

  static styles = css`
    :host {
      display: block;
    }
  `;

  firstUpdated() {
    // Initialize connection settings from query params or token attribute
    (this as any).initializeConnectionSettings();
    
    // If token is provided via attribute, use it
    if (this.wsToken) {
      (this as any).updateConnectionSettings({ token: this.wsToken });
    }

    // Sync the token from connection settings to wsToken
    this.wsToken = (this as any).connectionSettings.token;

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
      // Sync the token from connection settings to wsToken
      this.wsToken = (this as any).connectionSettings.token;
      
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
        <div>
          <p>WebSocket: ${this.isConnected ? "Connected" : "Disconnected"}</p>
          <slot></slot>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-client-main": SBClientMain;
  }
}
