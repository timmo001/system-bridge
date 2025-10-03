import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { WSClientMixin } from "./ws-client-mixin";

/**
 * System Bridge web client element.
 *
 * - Wraps the websocket client mixin to communicate with the backend.
 * - Provide an auth `token` attribute (mapped to `wsToken`). When set, the
 *   component auto-connects on first update, and displays connection status.
 * - Consumers can also call the mixin APIs directly (e.g. `connect`, `send`,
 *   `registerDataListener`, `getData`).
 */
@customElement("sb-client")
export class SBClient extends WSClientMixin(LitElement) {
  /** Auth token used for websocket requests. Set via `token` attribute. */
  @property({ type: String, attribute: "token" }) wsToken = "";

  firstUpdated() {
    if (this.wsToken) {
      this.connect();
    }
  }

  render() {
    return html`
      <div>
        <h1>System Bridge Client</h1>
        <p>WebSocket: ${this.isConnected ? "connected" : "disconnected"}</p>
      </div>
    `;
  }

  static styles = css`
    :host {
      max-width: 1280px;
      margin: 0 auto;
      padding: 2rem;
      text-align: center;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-client": SBClient;
  }
}
