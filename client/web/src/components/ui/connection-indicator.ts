import { html, type TemplateResult } from "lit";
import { customElement } from "lit/decorators.js";

import { AtomController } from "~/controllers/atom-controller";
import { connectionStatus } from "~/lib/atoms";
import { UIElement } from "~/mixins/light-dom";

@customElement("ui-connection-indicator")
class ConnectionIndicator extends UIElement {
  readonly #status = new AtomController(this, () => connectionStatus);

  render(): TemplateResult {
    const { isConnected } = this.#status.value;

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
