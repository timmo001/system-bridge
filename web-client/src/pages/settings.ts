import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("page-settings")
export class PageSettings extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div class="min-h-screen bg-background text-foreground p-8">
        <div class="max-w-4xl mx-auto">
          <h1 class="text-3xl font-bold mb-4">Settings</h1>
          <p class="text-muted-foreground">Settings page coming soon...</p>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-settings": PageSettings;
  }
}
