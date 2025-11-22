import { LitElement, html, css } from "lit";
import { customElement } from "lit/decorators.js";
import { cn } from "~/lib/utils";

@customElement("ui-label")
export class Label extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
    }
  `;

  render() {
    const classes = cn(
      "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
    );

    return html` <label class=${classes}><slot></slot></label> `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-label": Label;
  }
}
