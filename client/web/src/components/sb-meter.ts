import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import { severityColor } from "./sb-gauge";
import { shared } from "./shared-styles";

/**
 * A reading as a bar, with a label above it, such as a disk's used space.
 * Coloured by `warning` and `danger` like `sb-gauge`.
 */
@customElement("sb-meter")
export class SbMeter extends LitElement {
  static override styles = [
    shared,
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--sb-space-1-5);
        min-width: 0;
      }

      .top {
        display: flex;
        align-items: baseline;
        gap: var(--sb-space-2);
        font-size: var(--sb-font-size-s);
      }

      .label {
        flex: 1;
        min-width: 0;
      }

      .value {
        font-variant-numeric: tabular-nums;
        color: var(--sb-color-muted);
        white-space: nowrap;
      }

      .bar {
        height: var(--sb-meter-height, 0.5rem);
        overflow: hidden;
        background: var(--sb-color-sunken);
        border-radius: var(--sb-radius-pill);
      }

      .fill {
        height: 100%;
        border-radius: inherit;
        transition:
          width var(--sb-duration-normal) var(--sb-easing),
          background var(--sb-duration-normal) var(--sb-easing);
      }

      .caption {
        font-size: var(--sb-font-size-xs);
        color: var(--sb-color-muted);
      }
    `,
  ];

  @property({ type: Number }) value: number | null = null;

  @property({ type: Number }) max = 100;

  @property() label = "";

  /** The text on the right. Defaults to the value as a percentage. */
  @property() display = "";

  @property() caption = "";

  @property({ type: Number }) warning = 75;

  @property({ type: Number }) danger = 90;

  @property({ type: Boolean }) inverted = false;

  override render() {
    const known = this.value !== null && Number.isFinite(this.value);

    const percent = known
      ? Math.min(100, Math.max(0, ((this.value ?? 0) / this.max) * 100))
      : 0;

    return html`
      <div class="top">
        <span class="label truncate" title=${this.label}>${this.label}</span>
        <span class="value"
          >${this.display || (known ? `${percent.toFixed(0)}%` : "-")}</span
        >
      </div>
      <div
        class="bar"
        role="meter"
        aria-label=${this.label || nothing}
        aria-valuemin="0"
        aria-valuemax=${this.max}
        aria-valuenow=${known ? (this.value ?? 0) : nothing}
      >
        <div
          class="fill"
          style="width: ${percent}%; background: ${severityColor(
            known ? percent : null,
            this.warning,
            this.danger,
            this.inverted,
          )}"
        ></div>
      </div>
      ${
        // The formatters give "-" for an unknown value
        this.caption === "" || this.caption === "-"
          ? nothing
          : html`<span class="caption truncate">${this.caption}</span>`
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-meter": SbMeter;
  }
}
