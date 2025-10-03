import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import "./sb-client-main";
import "./sb-connection-form";

/**
 * System Bridge web client element.
 *
 * - A wrapper component that renders the main client element.
 * - Passes through the `apiKey` attribute to the underlying sb-client-main element.
 */
@customElement("sb-client")
export class SBClient extends LitElement {
  /** Auth API key passed to the main client element. */
  @property({ type: String, attribute: "apiKey" }) apiKey = "";

  render() {
    return html`
      <sb-client-main apiKey="${this.apiKey}">
        <slot></slot>
      </sb-client-main>
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
