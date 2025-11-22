import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { cn } from "~/lib/utils";
import { UIElement } from "~/mixins";

@customElement("ui-label")
export class Label extends UIElement {
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
