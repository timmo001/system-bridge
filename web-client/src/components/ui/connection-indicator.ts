import { consume } from "@lit/context";
import { html, type TemplateResult } from "lit";
import { customElement } from "lit/decorators.js";

import {
  connectionStatusContext,
  type ConnectionStatus,
} from "~/contexts/connection-status";
import { UIElement } from "~/mixins/light-dom";

@customElement("ui-connection-indicator")
class ConnectionIndicator extends UIElement {
  @consume({ context: connectionStatusContext, subscribe: true })
  private _status?: ConnectionStatus;

  render(): TemplateResult {
    const isConnected = this._status?.isConnected ?? false;

    return html`
      <div class="flex items-center gap-2">
        <div
          class="h-3 w-3 rounded-full ${
            isConnected ? "bg-primary" : "bg-destructive"
          }"
        ></div>
        <span class="text-sm text-muted-foreground">
          ${isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-connection-indicator": ConnectionIndicator;
  }
}
