import { html } from "lit";
import { PageElement } from "~/mixins";
import { customElement } from "lit/decorators.js";
import { consume } from "@lit/context";
import { websocketContext, type WebSocketState } from "~/contexts/websocket";
import {
  connectionContext,
  type ConnectionSettings,
} from "~/contexts/connection";
import "../components/ui/button";

@customElement("page-home")
export class PageHome extends PageElement {
  @consume({ context: websocketContext, subscribe: true })
  websocket?: WebSocketState;

  @consume({ context: connectionContext, subscribe: true })
  connection?: ConnectionSettings;

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
              <div class="space-y-2">
                <h2 class="text-2xl font-semibold">Connection Status</h2>
                <div class="flex items-center gap-2">
                  <div
                    class="h-3 w-3 rounded-full ${this.websocket?.isConnected
                      ? "bg-primary"
                      : "bg-destructive"}"
                  ></div>
                  <span class="text-sm">
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
              </div>
            </div>

            ${this.connection
              ? html`
                  <div class="rounded-lg border bg-card p-6">
                    <h2 class="text-xl font-semibold mb-4">
                      Connection Settings
                    </h2>
                    <div class="grid grid-cols-2 gap-4 text-sm">
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
                  </div>
                `
              : ""}

            <div class="flex gap-4">
              <ui-button
                variant="default"
                @click=${() => this.navigate("/data")}
              >
                View Data
              </ui-button>
              <ui-button
                variant="secondary"
                @click=${() => this.navigate("/settings")}
              >
                Settings
              </ui-button>
              <ui-button
                variant="outline"
                @click=${() => this.navigate("/connection")}
              >
                Connection
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
