import { consume } from "@lit/context";
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";

import { websocketContext, type WebSocketState } from "~/contexts/websocket";
import { Modules, type ModuleName } from "~/lib/system-bridge/types-modules";
import { PageElement } from "~/mixins";
import "../components/ui/button";
import "../components/ui/code-block";
import "../components/ui/icon";
import "../components/ui/tabs";

@customElement("page-data")
export class PageData extends PageElement {
  @consume({ context: websocketContext, subscribe: true })
  websocket?: WebSocketState;

  @state()
  private selectedTab: ModuleName = "system";

  connectedCallback() {
    super.connectedCallback();
    // Set first module as default
    if (Modules.length > 0) {
      this.selectedTab = Modules[0];
    }
  }

  private handleTabChange = (e: CustomEvent<{ value: string }>): void => {
    this.selectedTab = e.detail.value as ModuleName;
  };

  private handleNavigateToConnection = (): void => {
    this.navigate("/connection");
  };

  private handleNavigateToHome = (): void => {
    this.navigate("/");
  };

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private renderTabTriggers() {
    return Modules.map(
      (module) => html`
        <ui-tabs-trigger value=${module} ?active=${this.selectedTab === module}>
          ${this.capitalizeFirst(module)}
        </ui-tabs-trigger>
      `,
    );
  }

  private renderTabContents() {
    return Modules.map(
      (module) => html`
        <ui-tabs-content value=${module} ?hidden=${this.selectedTab !== module}>
          <div class="mt-4">
            <div class="rounded-lg border bg-card p-4">
              <h2 class="text-xl font-semibold mb-4">
                ${this.capitalizeFirst(module)} Data
              </h2>
              ${this.websocket?.data?.[module]
                ? html`
                    <ui-code-block
                      .data=${this.websocket.data[module]}
                    ></ui-code-block>
                  `
                : html`
                    <div
                      class="text-sm text-muted-foreground italic p-4 text-center"
                    >
                      No data available for ${module}
                    </div>
                  `}
            </div>
          </div>
        </ui-tabs-content>
      `,
    );
  }

  render() {
    const isConnected = this.websocket?.isConnected ?? false;
    const error = this.websocket?.error;

    return html`
      <div class="min-h-screen bg-background text-foreground p-8">
        <div class="max-w-7xl mx-auto space-y-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <ui-button
                variant="ghost"
                size="icon"
                @click=${this.handleNavigateToHome}
                aria-label="Back to home"
              >
                <ui-icon name="ArrowLeft"></ui-icon>
              </ui-button>
              <div>
                <h1 class="text-3xl font-bold mb-2">System Data</h1>
                <p class="text-muted-foreground">
                  Real-time data from System Bridge modules
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <div
                class="h-3 w-3 rounded-full ${isConnected
                  ? "bg-primary"
                  : "bg-destructive"}"
              ></div>
              <span class="text-sm text-muted-foreground">
                ${isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>

          ${!isConnected
            ? html`
                <div
                  class="rounded-lg border border-destructive bg-destructive/10 p-6"
                >
                  <h3 class="text-lg font-semibold text-destructive mb-2">
                    Not Connected
                  </h3>
                  <p class="text-sm text-destructive/90 mb-4">
                    ${error || "Please connect to System Bridge to view data."}
                  </p>
                  <ui-button
                    variant="default"
                    @click=${this.handleNavigateToConnection}
                  >
                    Configure Connection
                  </ui-button>
                </div>
              `
            : html`
                <ui-tabs
                  .value=${this.selectedTab}
                  @tab-change=${this.handleTabChange}
                >
                  <ui-tabs-list> ${this.renderTabTriggers()} </ui-tabs-list>

                  ${this.renderTabContents()}
                </ui-tabs>
              `}
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
