import { ContextConsumer } from "@lit/context";
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";

import {
  connectionContext,
  type ConnectionSettings,
} from "~/contexts/connection";
import { websocketContext, type WebSocketState } from "~/contexts/websocket";
import { PageElement } from "~/mixins";
import "../components/ui/button";

@customElement("page-home")
export class PageHome extends PageElement {
  @state()
  websocket?: WebSocketState;

  @state()
  connection?: ConnectionSettings;

  private _websocketConsumer!: ContextConsumer<typeof websocketContext>;
  private _connectionConsumer!: ContextConsumer<typeof connectionContext>;

  constructor() {
    super();
    this._websocketConsumer = new ContextConsumer(this, {
      context: websocketContext,
      callback: (value) => {
        this.websocket = value;
      },
      subscribe: true,
    });
    this._connectionConsumer = new ContextConsumer(this, {
      context: connectionContext,
      callback: (value) => {
        this.connection = value;
      },
      subscribe: true,
    });
  }

  private handleNavigateToConnection = (): void => {
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

          <div class="space-y-4">
            <div
              class="rounded-lg border bg-card p-6 ${this.websocket?.isConnected
                ? "border-primary"
                : "border-destructive"}"
            >
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <h2 class="text-2xl font-semibold">Connection</h2>
                  <ui-button
                    variant="outline"
                    @click=${this.handleNavigateToConnection}
                  >
                    Setup Connection
                  </ui-button>
                </div>

                <div class="flex items-center gap-2">
                  <div
                    class="h-3 w-3 rounded-full ${this.websocket?.isConnected
                      ? "bg-primary"
                      : "bg-destructive"}"
                  ></div>
                  <span class="text-sm font-medium">
                    ${this.websocket?.isConnected
                      ? "Connected"
                      : "Disconnected"}
                  </span>
                </div>

                ${this.websocket?.error
                  ? html`
                      <div
                        class="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
                      >
                        ${this.websocket.error}
                      </div>
                    `
                  : ""}
                ${this.connection
                  ? html`
                      <div class="grid grid-cols-2 gap-4 text-sm pt-2">
                        <div>
                          <span class="text-muted-foreground">Host:</span>
                          <span class="ml-2 font-mono"
                            >${this.connection.host}</span
                          >
                        </div>
                        <div>
                          <span class="text-muted-foreground">Port:</span>
                          <span class="ml-2 font-mono"
                            >${this.connection.port}</span
                          >
                        </div>
                        <div>
                          <span class="text-muted-foreground">SSL:</span>
                          <span class="ml-2"
                            >${this.connection.ssl ? "Yes" : "No"}</span
                          >
                        </div>
                        <div>
                          <span class="text-muted-foreground">Token:</span>
                          <span class="ml-2 font-mono">
                            ${this.connection.token ? "••••••••" : "Not set"}
                          </span>
                        </div>
                      </div>
                    `
                  : ""}
              </div>
            </div>

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
