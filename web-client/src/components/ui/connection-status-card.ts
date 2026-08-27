import { consume } from "@lit/context";
import { html, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import {
  connectionContext,
  type ConnectionSettings,
} from "~/contexts/connection";
import {
  connectionStatusContext,
  type ConnectionStatus,
} from "~/contexts/connection-status";
import { UIElement } from "~/mixins/light-dom";
import "./button";
import "./icon";

@customElement("ui-connection-status-card")
class ConnectionStatusCard extends UIElement {
  @property({ type: Boolean }) showSetupButton = false;

  @consume({ context: connectionStatusContext, subscribe: true })
  private _status?: ConnectionStatus;

  @consume({ context: connectionContext, subscribe: true })
  private _connection?: ConnectionSettings;

  @state()
  private _copyStatus: "idle" | "copied" | "error" = "idle";

  private handleSetupConnection = (): void => {
    this.dispatchEvent(
      new CustomEvent("setup-connection", {
        bubbles: true,
        composed: true,
      }),
    );
  };

  private get mcpURL(): string | null {
    if (!this._connection) return null;
    return `${this._connection.ssl ? "https" : "http"}://${this._connection.host}:${this._connection.port}/api/mcp`;
  }

  private handleCopyMCPURL = async (): Promise<void> => {
    if (!this.mcpURL || !this._connection?.token) return;

    const url = `${this.mcpURL}?token=${encodeURIComponent(this._connection.token)}`;
    try {
      if (window.isSecureContext && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement("textarea");
        input.value = url;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.append(input);
        try {
          input.select();
          if (!document.execCommand("copy")) {
            throw new Error("Browser rejected the copy command");
          }
        } finally {
          input.remove();
        }
      }
      this._copyStatus = "copied";
    } catch (error) {
      this._copyStatus = "error";
      console.error("Failed to copy MCP URL to clipboard:", error);
    }
  };

  private renderConnectionIndicator(isConnected: boolean): TemplateResult {
    return html`
      <div class="flex items-center gap-2">
        <div
          class="h-3 w-3 rounded-full ${
            isConnected ? "bg-primary" : "bg-destructive"
          }"
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
    const mcpURL = this.mcpURL;
    if (!this._connection || !mcpURL) return html``;
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
        <div class="col-span-2 flex items-center gap-2">
          <span class="text-muted-foreground">MCP URL:</span>
          <span class="min-w-0 flex-1 font-mono break-all">
            ${mcpURL}${this._connection.token ? "?token=*****" : ""}
          </span>
          ${
            this._connection.token
              ? html`
                  <span
                    class="text-xs text-muted-foreground"
                    role="status"
                    aria-live="polite"
                  >
                    ${
                      this._copyStatus === "copied"
                        ? "Copied"
                        : this._copyStatus === "error"
                          ? "Copy failed"
                          : ""
                    }
                  </span>
                  <ui-button
                    variant="ghost"
                    size="icon"
                    @click=${this.handleCopyMCPURL}
                    aria-label="Copy authenticated MCP URL"
                    title="Copy authenticated MCP URL"
                  >
                    <ui-icon name="Copy" size="16"></ui-icon>
                  </ui-button>
                `
              : ""
          }
        </div>
      </div>
    `;
  }

  render(): TemplateResult {
    const isConnected = this._status?.isConnected ?? false;

    return html`
      <div
        class="rounded-lg border bg-card p-6 mb-6 ${
          isConnected ? "border-primary" : "border-destructive"
        }"
      >
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-semibold">Connection</h2>
            ${
              this.showSetupButton
                ? html`
                    <ui-button
                      variant="outline"
                      @click=${this.handleSetupConnection}
                    >
                      Setup Connection
                    </ui-button>
                  `
                : ""
            }
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
