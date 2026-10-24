import { mdiChevronRight } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import { icon, shared } from "./shared-styles";

/**
 * A surface with an optional header, after Home Assistant's `ha-card`. A
 * card with an `href` links its heading to more detail.
 *
 * @slot - The card's content.
 * @slot actions - Controls at the end of the header.
 * @slot footer - Content under a divider at the bottom.
 */
@customElement("sb-card")
export class SbCard extends LitElement {
  static override styles = [
    shared,
    css`
      :host {
        display: flex;
        flex-direction: column;
        min-width: 0;
        background: var(--sb-color-surface);
        border: 1px solid var(--sb-color-border);
        border-radius: var(--sb-radius-l);
      }

      header {
        display: flex;
        align-items: center;
        gap: var(--sb-space-3);
        min-height: 3.25rem;
        padding: var(--sb-space-3) var(--sb-space-4) 0 var(--sb-space-5);
      }

      .heading {
        display: flex;
        flex: 1;
        align-items: center;
        gap: var(--sb-space-3);
        min-width: 0;
        color: inherit;
        text-decoration: none;
      }

      .heading > .icon {
        padding: var(--sb-space-1-5);
        width: 2rem;
        height: 2rem;
        color: var(--sb-card-color, var(--sb-color-accent));
        background: color-mix(
          in oklab,
          var(--sb-card-color, var(--sb-color-accent)) 14%,
          transparent
        );
        border-radius: var(--sb-radius-m);
      }

      a.heading:hover h2 {
        text-decoration: underline;
        text-underline-offset: 0.2em;
      }

      .titles {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      h2 {
        font-size: var(--sb-font-size-m);
      }

      .subheading {
        font-size: var(--sb-font-size-xs);
        color: var(--sb-color-muted);
      }

      .chevron {
        color: var(--sb-color-muted);
      }

      .content {
        display: flex;
        flex: 1;
        flex-direction: column;
        gap: var(--sb-space-4);
        padding: var(
          --sb-card-padding,
          var(--sb-space-4) var(--sb-space-5) var(--sb-space-5)
        );
        min-width: 0;
      }

      :host(:not([heading])) .content {
        padding-top: var(--sb-space-5);
      }

      footer {
        padding: var(--sb-space-3) var(--sb-space-5);
        border-top: 1px solid var(--sb-color-border);
      }

      .no-footer {
        display: none;
      }
    `,
  ];

  @property({ reflect: true }) heading = "";

  @property() subheading = "";

  /** An `@mdi/js` path shown before the heading. */
  @property() icon = "";

  /** Links the heading, such as to a module's own page. */
  @property() href = "";

  #hasFooter = false;

  #onFooterSlotChange = (event: Event) => {
    if (event.target instanceof HTMLSlotElement) {
      const has = event.target.assignedNodes().length > 0;

      if (has !== this.#hasFooter) {
        this.#hasFooter = has;
        this.requestUpdate();
      }
    }
  };

  #renderHeading() {
    const content = html`
      ${this.icon === "" ? nothing : icon(this.icon)}
      <span class="titles">
        <h2 class="truncate">${this.heading}</h2>
        ${
          this.subheading === ""
            ? nothing
            : html`<span class="subheading truncate">${this.subheading}</span>`
        }
      </span>
    `;

    return this.href === ""
      ? html`<div class="heading">${content}</div>`
      : html`<a class="heading" href=${this.href}>
          ${content}<span class="chevron row">${icon(mdiChevronRight)}</span>
        </a>`;
  }

  override render() {
    return html`
      ${
        this.heading === ""
          ? nothing
          : html`<header>
              ${this.#renderHeading()}
              <slot name="actions"></slot>
            </header>`
      }
      <div class="content"><slot></slot></div>
      <footer class=${this.#hasFooter ? "" : "no-footer"}>
        <slot name="footer" @slotchange=${this.#onFooterSlotChange}></slot>
      </footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-card": SbCard;
  }
}
