import { ContextConsumer } from "@lit/context";
import { html, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";

import {
  connectionContext,
  type ConnectionSettings,
} from "~/contexts/connection";
import { websocketContext, type WebSocketState } from "~/contexts/websocket";
import { UIElement } from "~/mixins";

@customElement("ui-connection-status-card")
export class ConnectionStatusCard extends UIElement {
  @property({ type: Boolean }) showSetupButton = false;

  private _websocket?: WebSocketState;
  private _connection?: ConnectionSettings;

  // Consumers must be stored to keep subscriptions alive
  // @ts-expect-error - TS6133: Field is used via subscription callback
  private _websocketConsumer!: ContextConsumer<typeof websocketContext, this>;
  // @ts-expect-error - TS6133: Field is used via subscription callback
  private _connectionConsumer!: ContextConsumer<typeof connectionContext, this>;

  constructor() {
    super();
    this._websocketConsumer = new ContextConsumer(this, {
      context: websocketContext,
      callback: (value) => {
        this._websocket = value;
        this.requestUpdate();
      },
      subscribe: true,
    });
    this._connectionConsumer = new ContextConsumer(this, {
      context: connectionContext,
      callback: (value) => {
        this._connection = value;
        this.requestUpdate();
      },
      subscribe: true,
    });
  }

  private handleSetupConnection = (): void => {
    this.dispatchEvent(
      new CustomEvent("setup-connection", {
        bubbles: true,
        composed: true,
      }),
    );
  };

  render(): TemplateResult {
    const isConnected = this._websocket?.isConnected ?? false;

    return html`
      <div
        class="rounded-lg border bg-card p-6 ${isConnected
          ? "border-primary"
          : "border-destructive"}"
      >
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-semibold">Connection</h2>
            ${this.showSetupButton
              ? html`
                  <ui-button
                    variant="outline"
                    @click=${this.handleSetupConnection}
                  >
                    Setup Connection
                  </ui-button>
                `
              : ""}
          </div>

          <div class="flex items-center gap-2">
            <div
              class="h-3 w-3 rounded-full ${isConnected
                ? "bg-primary"
                : "bg-destructive"}"
            ></div>
            <span class="text-sm font-medium">
              ${isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>

          ${this._websocket?.error
            ? html`
                <div
                  class="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
                >
                  ${this._websocket.error}
                </div>
              `
            : ""}
          ${this._connection
            ? html`
                <div class="grid grid-cols-2 gap-4 text-sm pt-2">
                  <div>
                    <span class="text-muted-foreground">Host:</span>
                    <span class="ml-2 font-mono">${this._connection.host}</span>
                  </div>
                  <div>
                    <span class="text-muted-foreground">Port:</span>
                    <span class="ml-2 font-mono">${this._connection.port}</span>
                  </div>
                  <div>
                    <span class="text-muted-foreground">SSL:</span>
                    <span class="ml-2"
                      >${this._connection.ssl ? "Yes" : "No"}</span
                    >
                  </div>
                  <div>
                    <span class="text-muted-foreground">Token:</span>
                    <span class="ml-2 font-mono">
                      ${this._connection.token ? "••••••••" : "Not set"}
                    </span>
                  </div>
                </div>
              `
            : ""}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-connection-status-card": ConnectionStatusCard;
  }
}
