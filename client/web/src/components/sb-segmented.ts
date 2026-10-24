import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import { icon, shared } from "./shared-styles";

export interface SegmentOption {
  readonly value: string;
  readonly label: string;
  /** An `@mdi/js` path shown before the label. */
  readonly icon?: string;
  /** Makes the segment a link, so the choice can live in the URL. */
  readonly href?: string;
}

/**
 * A group of chips with one chosen, after Home Assistant's button toggle
 * group. Segments with an `href` are links; the rest are radio buttons.
 *
 * @fires value-changed - When a button segment is chosen.
 */
@customElement("sb-segmented")
export class SbSegmented extends LitElement {
  static override styles = [
    shared,
    css`
      :host {
        display: inline-flex;
      }

      .group {
        display: inline-flex;
        gap: var(--sb-space-0-5);
        padding: var(--sb-space-0-5);
        background: var(--sb-color-sunken);
        border: 1px solid var(--sb-color-border);
        border-radius: var(--sb-radius-pill);
      }

      .segment {
        display: inline-flex;
        align-items: center;
        gap: var(--sb-space-1-5);
        min-height: 1.875rem;
        padding: 0 var(--sb-space-3);
        font: inherit;
        font-size: var(--sb-font-size-xs);
        font-weight: var(--sb-font-weight-medium);
        color: var(--sb-color-muted);
        text-decoration: none;
        white-space: nowrap;
        cursor: pointer;
        background: none;
        border: 0;
        border-radius: var(--sb-radius-pill);
        transition:
          background var(--sb-duration-fast) var(--sb-easing),
          color var(--sb-duration-fast) var(--sb-easing);
        --sb-icon-size: 1rem;
      }

      .segment:hover {
        color: var(--sb-color-text);
      }

      .segment[aria-checked="true"],
      .segment[aria-current="page"] {
        color: var(--sb-color-on-accent);
        background: var(--sb-color-accent);
      }

      :host([icons-only]) .label {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip-path: inset(50%);
      }

      :host([icons-only]) .segment {
        padding: 0 var(--sb-space-2);
      }

      /* Labels give way to icons when there's no room for them */
      @media (max-width: 40rem) {
        :host([narrow-icons]) .label {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip-path: inset(50%);
        }

        :host([narrow-icons]) .segment {
          padding: 0 var(--sb-space-2-5, 0.625rem);
        }
      }
    `,
  ];

  @property({ attribute: false })
  options: readonly SegmentOption[] = [];

  @property() value = "";

  @property() label = "";

  /** Shows only the icons, keeping the labels for assistive technology. */
  @property({ type: Boolean, reflect: true, attribute: "icons-only" })
  iconsOnly = false;

  /** Shows only the icons on narrow screens. */
  @property({ type: Boolean, reflect: true, attribute: "narrow-icons" })
  narrowIcons = false;

  #choose(value: string) {
    if (value === this.value) return;

    this.value = value;
    this.dispatchEvent(
      new CustomEvent("value-changed", {
        detail: { value },
        bubbles: true,
        composed: true,
      }),
    );
  }

  #onKeyDown = (event: KeyboardEvent) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;

    if (step === 0) return;

    event.preventDefault();

    const index = this.options.findIndex((o) => o.value === this.value);

    const next =
      this.options[(index + step + this.options.length) % this.options.length];

    if (next === undefined) return;

    if (next.href === undefined) {
      this.#choose(next.value);
    }

    void this.updateComplete.then(() => {
      const segment = this.renderRoot.querySelector(
        `[data-value="${CSS.escape(next.value)}"]`,
      );

      if (segment instanceof HTMLElement) segment.focus();
    });
  };

  #onClick = (event: MouseEvent) => {
    const segment = event
      .composedPath()
      .find(
        (target) =>
          target instanceof HTMLButtonElement &&
          target.dataset.value !== undefined,
      );

    if (segment instanceof HTMLButtonElement) {
      this.#choose(segment.dataset.value ?? "");
    }
  };

  #renderSegment(option: SegmentOption) {
    const chosen = option.value === this.value;

    const content = html`${
        option.icon === undefined ? nothing : icon(option.icon)
      }<span class="label">${option.label}</span>`;

    return option.href === undefined
      ? html`<button
          class="segment"
          type="button"
          role="radio"
          data-value=${option.value}
          aria-checked=${chosen ? "true" : "false"}
          tabindex=${chosen ? 0 : -1}
          title=${this.iconsOnly || this.narrowIcons ? option.label : nothing}
        >
          ${content}
        </button>`
      : html`<a
          class="segment"
          href=${option.href}
          data-value=${option.value}
          aria-current=${chosen ? "page" : nothing}
          title=${this.iconsOnly || this.narrowIcons ? option.label : nothing}
        >
          ${content}
        </a>`;
  }

  override render() {
    const links = this.options.some((option) => option.href !== undefined);
    const segments = this.options.map((option) => this.#renderSegment(option));

    return html`
      <div
        class="group"
        role=${links ? "group" : "radiogroup"}
        aria-label=${this.label || nothing}
        @keydown=${this.#onKeyDown}
        @click=${this.#onClick}
      >
        ${segments}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-segmented": SbSegmented;
  }
}
