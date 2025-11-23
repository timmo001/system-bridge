import { consume } from "@lit/context";
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";

import { websocketContext, type WebSocketState } from "~/contexts/websocket";
import { Modules, type ModuleName } from "~/lib/system-bridge/types-modules";
import { PageElement } from "~/mixins";
import "../components/ui/button";
import "../components/ui/code-block";
import "../components/ui/connection-indicator";
import "../components/ui/connection-required";
import "../components/ui/icon";
import "../components/ui/tabs";

@customElement("page-data")
export class PageData extends PageElement {
  title = "Data";
  description = "Real-time data from System Bridge modules";

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

    return html`
      <div class="min-h-screen bg-background text-foreground p-8">
        <div class="max-w-7xl mx-auto space-y-6">
          ${this.renderPageHeader()}
          ${!isConnected
            ? html`
                <ui-connection-required
                  message="Please connect to System Bridge to view data."
                  @configure-connection=${this.handleNavigateToConnection}
                ></ui-connection-required>
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
