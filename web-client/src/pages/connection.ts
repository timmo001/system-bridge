import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("page-connection")
export class PageConnection extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div class="min-h-screen bg-background text-foreground p-8">
        <div class="max-w-2xl mx-auto">
          <h1 class="text-3xl font-bold mb-4">Connection Settings</h1>
          <p class="text-muted-foreground">Connection page coming soon...</p>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-connection": PageConnection;
  }
}
