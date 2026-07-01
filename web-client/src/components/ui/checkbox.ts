import { html } from "lit";
import { customElement, property } from "lit/decorators.js";

import { cn } from "~/lib/utils";
import { UIElement } from "~/mixins/light-dom";

@customElement("ui-checkbox")
class Checkbox extends UIElement {
  @property({ type: Boolean }) checked = false;
  @property({ type: Boolean }) disabled = false;
  @property() name = "";

  render() {
    const boxClasses = cn(
      "peer inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary",
      "shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-50",
      this.checked ? "bg-primary text-primary-foreground" : "bg-background",
      !this.disabled && "cursor-pointer",
    );

    return html`
      <button
        type="button"
        role="checkbox"
        aria-checked=${this.checked}
        ?disabled=${this.disabled}
        class=${boxClasses}
        @click=${this._handleClick}
      >
        ${
          this.checked
            ? html`<svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-3 w-3"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>`
            : null
        }
      </button>
    `;
  }

  private _handleClick = () => {
    if (this.disabled) return;
    this.checked = !this.checked;
    this.dispatchEvent(
      new CustomEvent("checkbox-change", {
        detail: { checked: this.checked },
        bubbles: true,
        composed: true,
      }),
    );
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-checkbox": Checkbox;
  }
}
