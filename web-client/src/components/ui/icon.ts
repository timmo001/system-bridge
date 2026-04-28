import { html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import { UIElement } from "~/mixins/light-dom";

@customElement("ui-icon")
class Icon extends UIElement {
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

  private applyIconAttributes(element: Element): void {
    if (this.size) {
      element.setAttribute("width", String(this.size));
      element.setAttribute("height", String(this.size));
    }
    if (this.className) {
      element.setAttribute("class", this.className);
    }
  }

  // fallow-ignore-next-line complexity
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
      this.applyIconAttributes(element);
      this.iconHtml = element.outerHTML;
    } catch (error) {
      console.error(`Failed to load icon "${this.name}":`, error);
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
