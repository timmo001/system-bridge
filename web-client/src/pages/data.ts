import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("page-data")
export class PageData extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div class="min-h-screen bg-background text-foreground p-8">
        <div class="max-w-6xl mx-auto">
          <h1 class="text-3xl font-bold mb-4">System Data</h1>
          <p class="text-muted-foreground">Data page coming soon...</p>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-data": PageData;
  }
}
