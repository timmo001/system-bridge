import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { cn } from "~/lib/utils";

@customElement("ui-switch")
export class Switch extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
    }
  `;

  @property({ type: Boolean }) checked = false;
  @property({ type: Boolean }) disabled = false;
  @property() name = "";

  render() {
    const buttonClasses = cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent",
      "shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-50",
      this.checked ? "bg-primary" : "bg-input",
    );

    const thumbClasses = cn(
      "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
      this.checked ? "translate-x-4" : "translate-x-0",
    );

    return html`
      <button
        type="button"
        role="switch"
        aria-checked=${this.checked}
        ?disabled=${this.disabled}
        class=${buttonClasses}
        @click=${this._handleClick}
      >
        <span class=${thumbClasses}></span>
      </button>
    `;
  }

  private _handleClick() {
    if (this.disabled) return;
    this.checked = !this.checked;
    this.dispatchEvent(
      new CustomEvent("switch-change", {
        detail: { checked: this.checked },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-switch": Switch;
  }
}
