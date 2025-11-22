import { html } from "lit";
import { customElement } from "lit/decorators.js";

import { PageElement } from "~/mixins";
import "../components/ui/button";
import "../components/ui/connection-status-card";

@customElement("page-home")
export class PageHome extends PageElement {
  private handleSetupConnection = (): void => {
    this.navigate("/connection");
  };

  private handleNavigateToData = (): void => {
    this.navigate("/data");
  };

  private handleNavigateToSettings = (): void => {
    this.navigate("/settings");
  };

  render() {
    return html`
      <div class="min-h-screen bg-background text-foreground p-8">
        <div class="max-w-4xl mx-auto space-y-8">
          <div class="space-y-2">
            <h1 class="text-4xl font-bold">System Bridge</h1>
            <p class="text-muted-foreground">A bridge for your systems</p>
          </div>

          <div class="space-y-6">
            <ui-connection-status-card
              ?showSetupButton=${true}
              @setup-connection=${this.handleSetupConnection}
            ></ui-connection-status-card>

            <div class="flex gap-4 justify-center">
              <ui-button variant="default" @click=${this.handleNavigateToData}>
                View Data
              </ui-button>
              <ui-button
                variant="default"
                @click=${this.handleNavigateToSettings}
              >
                Manage Settings
              </ui-button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-home": PageHome;
  }
}
