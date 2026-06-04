import { consume } from "@lit/context";
import { html, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";

import {
  connectionContext,
  type ConnectionSettings,
} from "~/contexts/connection";
import {
  connectionStatusContext,
  type ConnectionStatus,
} from "~/contexts/connection-status";
import { UIElement } from "~/mixins/light-dom";

@customElement("ui-connection-status-card")
class ConnectionStatusCard extends UIElement {
  @property({ type: Boolean }) showSetupButton = false;

  @consume({ context: connectionStatusContext, subscribe: true })
  private _status?: ConnectionStatus;

  @consume({ context: connectionContext, subscribe: true })
  private _connection?: ConnectionSettings;

  private handleSetupConnection = (): void => {
    this.dispatchEvent(
      new CustomEvent("setup-connection", {
        bubbles: true,
        composed: true,
      }),
    );
  };

  private renderConnectionIndicator(isConnected: boolean): TemplateResult {
    return html`
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
    `;
  }

  private renderErrorBanner(): TemplateResult {
    if (!this._status?.error) return html``;
    return html`
      <div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        ${this._status.error}
      </div>
    `;
  }

  private renderConnectionDetails(): TemplateResult {
    if (!this._connection) return html``;
    return html`
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
          <span class="ml-2">${this._connection.ssl ? "Yes" : "No"}</span>
        </div>
        <div>
          <span class="text-muted-foreground">Token:</span>
          <span class="ml-2 font-mono">
            ${this._connection.token ? "••••••••" : "Not set"}
          </span>
        </div>
      </div>
    `;
  }

  // fallow-ignore-next-line complexity
  render(): TemplateResult {
    const isConnected = this._status?.isConnected ?? false;

    return html`
      <div
        class="rounded-lg border bg-card p-6 mb-6 ${isConnected
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

          ${this.renderConnectionIndicator(isConnected)}
          ${this.renderErrorBanner()} ${this.renderConnectionDetails()}
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
