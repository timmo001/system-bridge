import { html } from "lit";
import { customElement } from "lit/decorators.js";

import { cn } from "~/lib/utils";
import { UIElement } from "~/mixins";

@customElement("ui-label")
export class Label extends UIElement {
  connectedCallback() {
    super.connectedCallback();
    // Apply label classes directly to host element
    const classes = cn(
      "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
    );
    // eslint-disable-next-line wc/no-self-class
    this.setAttribute("class", classes);
  }

  render() {
    // In Light DOM, content displays naturally without slot
    return html``;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-label": Label;
  }
}
