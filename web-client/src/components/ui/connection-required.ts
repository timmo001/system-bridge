import { html, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";

import { AtomController } from "~/controllers/atom-controller";
import { connectionStatus } from "~/lib/atoms";
import { UIElement } from "~/mixins/light-dom";

@customElement("ui-connection-required")
class ConnectionRequired extends UIElement {
  readonly #status = new AtomController(this, () => connectionStatus);

  @property() message = "Please connect to System Bridge.";

  private handleConfigureConnection = (): void => {
    this.dispatchEvent(
      new CustomEvent("configure-connection", {
        bubbles: true,
        composed: true,
      }),
    );
  };

  render(): TemplateResult {
    const { error } = this.#status.value;

    return html`
      <div class="rounded-lg border border-destructive bg-destructive/10 p-6">
        <h3 class="text-lg font-semibold text-destructive mb-2">
          Not Connected
        </h3>
        <p class="text-sm text-destructive/90 mb-4">${error || this.message}</p>
        <ui-button variant="default" @click=${this.handleConfigureConnection}>
          Configure Connection
        </ui-button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-connection-required": ConnectionRequired;
  }
}
