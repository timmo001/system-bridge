import { css, html, LitElement, nothing, svg } from "lit";
import { customElement, property } from "lit/decorators.js";

import { shared } from "./shared-styles";

/** How much of the circle the gauge's track covers. */
const sweep = 270;

const radius = 40;

const circumference = 2 * Math.PI * radius;

const track = (circumference * sweep) / 360;

/**
 * The colour a reading shows in: the accent until it reaches `warning`, then
 * the warning and danger colours. Lower is worse when `inverted`, such as for
 * a battery.
 */
export const severityColor = (
  value: number | null | undefined,
  warning: number,
  danger: number,
  inverted = false,
): string => {
  if (value === null || value === undefined) return "var(--sb-color-muted)";

  const worse = (limit: number) => (inverted ? value <= limit : value >= limit);

  if (worse(danger)) return "var(--sb-color-danger)";

  if (worse(warning)) return "var(--sb-color-warning)";

  return "var(--sb-gauge-color, var(--sb-color-accent))";
};

/**
 * A reading on a dial, after Home Assistant's gauge card. The arc fills to
 * `value` between `min` and `max`, coloured by `warning` and `danger`.
 */
@customElement("sb-gauge")
export class SbGauge extends LitElement {
  static override styles = [
    shared,
    css`
      :host {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        gap: var(--sb-space-1);
        width: var(--sb-gauge-size, 8.5rem);
      }

      .dial {
        position: relative;
        width: 100%;
        aspect-ratio: 1;
      }

      svg {
        width: 100%;
        height: 100%;
        /* Start the arc at the bottom left, leaving the gap at the bottom */
        rotate: ${90 + (360 - sweep) / 2}deg;
      }

      circle {
        fill: none;
        stroke-width: 9;
        stroke-linecap: round;
      }

      .track {
        stroke: var(--sb-color-sunken);
      }

      .fill {
        transition:
          stroke-dashoffset var(--sb-duration-normal) var(--sb-easing),
          stroke var(--sb-duration-normal) var(--sb-easing);
      }

      .reading {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding-top: 6%;
      }

      .value {
        font-size: calc(var(--sb-gauge-size, 8.5rem) * 0.2);
        font-weight: var(--sb-font-weight-semibold);
        font-variant-numeric: tabular-nums;
        line-height: 1;
      }

      .unit {
        font-size: var(--sb-font-size-xs);
        color: var(--sb-color-muted);
      }

      .label {
        margin-top: calc(var(--sb-gauge-size, 8.5rem) * -0.12);
        font-size: var(--sb-font-size-s);
        font-weight: var(--sb-font-weight-medium);
        text-align: center;
      }

      .caption {
        font-size: var(--sb-font-size-xs);
        color: var(--sb-color-muted);
        text-align: center;
      }
    `,
  ];

  @property({ type: Number }) value: number | null = null;

  @property({ type: Number }) min = 0;

  @property({ type: Number }) max = 100;

  /** The text in the middle. Defaults to the rounded value. */
  @property() display = "";

  @property() unit = "%";

  @property() label = "";

  @property() caption = "";

  @property({ type: Number }) warning = 75;

  @property({ type: Number }) danger = 90;

  /** Lower readings are worse, such as for a battery. */
  @property({ type: Boolean }) inverted = false;

  override render() {
    const known = this.value !== null && Number.isFinite(this.value);

    const fraction = known
      ? Math.min(
          1,
          Math.max(0, ((this.value ?? 0) - this.min) / (this.max - this.min)),
        )
      : 0;

    const color = severityColor(
      this.value,
      this.warning,
      this.danger,
      this.inverted,
    );

    return html`
      <div
        class="dial"
        role="meter"
        aria-valuemin=${this.min}
        aria-valuemax=${this.max}
        aria-valuenow=${known ? (this.value ?? 0) : nothing}
        aria-label=${this.label || nothing}
      >
        <svg viewBox="0 0 100 100" aria-hidden="true">
          ${svg`
            <circle class="track" cx="50" cy="50" r=${radius}
              stroke-dasharray="${track} ${circumference}"></circle>
            <circle class="fill" cx="50" cy="50" r=${radius}
              stroke=${color}
              stroke-dasharray="${track} ${circumference}"
              stroke-dashoffset=${track * (1 - fraction)}
              opacity=${fraction === 0 ? 0 : 1}></circle>
          `}
        </svg>
        <div class="reading">
          <span class="value">
            ${this.display || (known ? Math.round(this.value ?? 0) : "-")}
          </span>
          ${this.unit === "" ? nothing : html`<span class="unit">${this.unit}</span>`}
        </div>
      </div>
      ${this.label === "" ? nothing : html`<span class="label">${this.label}</span>`}
      ${
        // The formatters give "-" for an unknown value
        this.caption === "" || this.caption === "-"
          ? nothing
          : html`<span class="caption">${this.caption}</span>`
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-gauge": SbGauge;
  }
}
