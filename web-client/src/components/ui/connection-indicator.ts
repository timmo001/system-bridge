import { consume } from "@lit/context";
import { html, type TemplateResult } from "lit";
import { customElement } from "lit/decorators.js";

import { websocketContext, type WebSocketState } from "~/contexts/websocket";
import { UIElement } from "~/mixins";

@customElement("ui-connection-indicator")
export class ConnectionIndicator extends UIElement {
  @consume({ context: websocketContext, subscribe: true })
  private _websocket?: WebSocketState;

  render(): TemplateResult {
    const isConnected = this._websocket?.isConnected ?? false;

    return html`
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-connection-indicator": ConnectionIndicator;
  }
}
