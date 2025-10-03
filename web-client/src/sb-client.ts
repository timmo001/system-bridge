import { LitElement, css, html } from "lit";
import { customElement } from "lit/decorators.js";

/**
 * A System Bridge client.
 *
 */
@customElement("sb-client")
export class SBClient extends LitElement {
  render() {
    return html`
      <div>
        <h1>System Bridge Client</h1>
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
