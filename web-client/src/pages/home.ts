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

  private handleNavigateToMedia = (): void => {
    this.navigate("/settings/media");
  };

  private handleNavigateToCommands = (): void => {
    this.navigate("/settings/commands");
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

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="rounded-lg border bg-card p-6 space-y-4">
                <h2 class="text-xl font-semibold">Data</h2>
                <p class="text-sm text-muted-foreground">
                  View real-time system data from all modules
                </p>
                <div class="flex flex-col gap-3">
                  <ui-button
                    variant="default"
                    class="w-full"
                    @click=${this.handleNavigateToData}
                  >
                    View Data
                  </ui-button>
                </div>
              </div>

              <div class="rounded-lg border bg-card p-6 space-y-4">
                <h2 class="text-xl font-semibold">Settings</h2>
                <p class="text-sm text-muted-foreground">
                  Configure System Bridge settings
                </p>
                <div class="flex flex-col gap-3">
                  <ui-button
                    variant="default"
                    class="w-full"
                    @click=${this.handleNavigateToSettings}
                  >
                    General Settings
                  </ui-button>
                  <ui-button
                    variant="default"
                    class="w-full"
                    @click=${this.handleNavigateToMedia}
                  >
                    Media Directories
                  </ui-button>
                  <ui-button
                    variant="default"
                    class="w-full"
                    @click=${this.handleNavigateToCommands}
                  >
                    Commands
                  </ui-button>
                </div>
              </div>
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
