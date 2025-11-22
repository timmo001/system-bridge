import { html } from "lit";
import { customElement, property } from "lit/decorators.js";

import { cn } from "~/lib/utils";
import { UIElement } from "~/mixins";

@customElement("ui-tabs")
export class Tabs extends UIElement {
  protected displayStyle = "block";

  @property() value = "";

  render() {
    return html`<div class="w-full"><slot></slot></div>`;
  }

  handleTabChange(newValue: string) {
    this.value = newValue;
    this.dispatchEvent(
      new CustomEvent("tab-change", {
        detail: { value: newValue },
        bubbles: true,
        composed: true,
      }),
    );
    this.requestUpdate();
  }
}

@customElement("ui-tabs-list")
export class TabsList extends UIElement {
  protected displayStyle = "block";

  render() {
    const classes = cn(
      "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground gap-1",
    );

    return html`<div class=${classes} role="tablist"><slot></slot></div>`;
  }
}

@customElement("ui-tabs-trigger")
export class TabsTrigger extends UIElement {
  @property() value = "";
  @property({ type: Boolean }) active = false;

  render() {
    const classes = cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      "cursor-pointer",
      this.active
        ? "bg-background text-foreground shadow"
        : "hover:bg-background/50 hover:text-foreground",
    );

    return html`
      <button
        type="button"
        role="tab"
        aria-selected=${this.active}
        class=${classes}
        @click=${this._handleClick}
      >
        <slot></slot>
      </button>
    `;
  }

  private _handleClick() {
    const tabs = this.closest("ui-tabs")!;
    if (tabs) {
      tabs.handleTabChange(this.value);
    }
  }
}

@customElement("ui-tabs-content")
export class TabsContent extends UIElement {
  protected displayStyle = "block";

  @property() value = "";
  @property({ type: Boolean, reflect: true }) hidden = false;

  render() {
    const classes = cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    );

    return html`<div class=${classes} role="tabpanel"><slot></slot></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-tabs": Tabs;
    "ui-tabs-list": TabsList;
    "ui-tabs-trigger": TabsTrigger;
    "ui-tabs-content": TabsContent;
  }
}
