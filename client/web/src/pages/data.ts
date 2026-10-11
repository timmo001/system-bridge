import { ModuleName } from "@timmo001/effect-system-bridge";
import { Schema } from "effect";
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";

import { AtomController } from "~/controllers/atom-controller";
import { latestModuleData } from "~/lib/atoms";
import { ModuleLabels } from "~/lib/modules";
import { PageElement } from "~/mixins/page-element";
import "../components/ui/button";
import "../components/ui/code-block";
import "../components/ui/connection-indicator";
import "../components/ui/connection-required";
import "../components/ui/icon";
import "../components/ui/tabs";

const Modules = ModuleName.literals;

const isModuleName = Schema.is(ModuleName);

@customElement("page-data")
class PageData extends PageElement {
  title = "Data";
  description = "Real-time data from System Bridge modules";

  readonly #data = new AtomController(this, () => latestModuleData);

  @state()
  private selectedTab: ModuleName = Modules[0];

  private handleTabChange = (e: CustomEvent<{ value: string }>): void => {
    if (isModuleName(e.detail.value)) this.selectedTab = e.detail.value;
  };

  private handleNavigateToConnection = (): void => {
    this.navigate("/connection");
  };

  private renderTabTriggers() {
    return Modules.map(
      (module) => html`
        <ui-tabs-trigger value=${module} ?active=${this.selectedTab === module}>
          ${ModuleLabels[module]}
        </ui-tabs-trigger>
      `,
    );
  }

  private renderTabContents() {
    const data = this.#data.value;

    return Modules.map(
      (module) => html`
        <ui-tabs-content
          value=${module}
          ?hidden=${this.selectedTab !== module}
          class="flex flex-col flex-1 min-h-0 mt-2"
        >
          ${
            data[module]
              ? html`
                  <ui-code-block
                    class="flex-1 min-h-0"
                    .data=${data[module]}
                  ></ui-code-block>
                `
              : html`
                  <div
                    class="text-sm text-muted-foreground italic p-4 text-center"
                  >
                    No data available for ${module}
                  </div>
                `
          }
        </ui-tabs-content>
      `,
    );
  }

  render() {
    const isConnected = this.status?.isConnected ?? false;

    return html`
      <div
        class="flex flex-col h-dvh overflow-hidden bg-background text-foreground p-8"
      >
        <div
          class="flex flex-col flex-1 min-h-0 max-w-7xl mx-auto w-full gap-6"
        >
          ${this.renderPageHeader()}
          ${
            !isConnected
              ? html`
                  <ui-connection-required
                    message="Please connect to System Bridge to view data."
                    @configure-connection=${this.handleNavigateToConnection}
                  ></ui-connection-required>
                `
              : html`
                  <div
                    class="flex flex-col flex-1 min-h-0 rounded-lg border bg-card p-4"
                  >
                    <ui-tabs
                      class="flex flex-col flex-1 min-h-0"
                      .value=${this.selectedTab}
                      @tab-change=${this.handleTabChange}
                    >
                      <ui-tabs-list> ${this.renderTabTriggers()} </ui-tabs-list>

                      ${this.renderTabContents()}
                    </ui-tabs>
                  </div>
                `
          }
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
