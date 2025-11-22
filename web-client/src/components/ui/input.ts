import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { cn } from "~/lib/utils";

@customElement("ui-input")
export class Input extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
  `;

  @property() type = "text";
  @property() value = "";
  @property() placeholder = "";
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) required = false;
  @property() name = "";

  render() {
    const classes = cn(
      "flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-sm transition-colors",
      "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
      "placeholder:text-muted-foreground",
      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
      "disabled:cursor-not-allowed disabled:opacity-50",
    );

    return html`
      <input
        type=${this.type}
        class=${classes}
        .value=${this.value}
        placeholder=${this.placeholder}
        ?disabled=${this.disabled}
        ?required=${this.required}
        name=${this.name}
        @input=${this._handleInput}
        @change=${this._handleChange}
      />
    `;
  }

  private _handleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.value = input.value;
    this.dispatchEvent(
      new CustomEvent("input-change", {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _handleChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.value = input.value;
    this.dispatchEvent(
      new CustomEvent("value-changed", {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-input": Input;
  }
}
