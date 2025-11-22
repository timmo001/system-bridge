import { html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import { UIElement } from "~/mixins";

@customElement("ui-icon")
export class Icon extends UIElement {
  @property() name = "";
  @property() size: string | number = 24;
  @property() className = "";

  @state()
  private iconHtml = "";

  connectedCallback() {
    super.connectedCallback();
    void this.loadIcon();
  }

  updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has("name")) {
      void this.loadIcon();
    }
  }

  private async loadIcon() {
    if (!this.name) {
      this.iconHtml = "";
      return;
    }

    try {
      const { createElement, icons } = await import("lucide");
      const iconKey = this.name as keyof typeof icons;
      const iconData = icons[iconKey];

      if (!iconData || typeof iconData !== "object") {
        this.iconHtml = "";
        return;
      }

      const element = createElement(iconData);

      // Apply size if provided
      if (this.size) {
        element.setAttribute("width", String(this.size));
        element.setAttribute("height", String(this.size));
      }

      // Apply className if provided
      if (this.className) {
        element.setAttribute("class", this.className);
      }

      this.iconHtml = element.outerHTML;
    } catch {
      this.iconHtml = "";
    }
  }

  render() {
    return html`${unsafeHTML(this.iconHtml)}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-icon": Icon;
  }
}
