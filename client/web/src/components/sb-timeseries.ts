import { areaY, defineChart, lineY } from "@tanstack/charts";
import { crosshair } from "@tanstack/charts/crosshair";
import { defineChartElement } from "@tanstack/charts/lit";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";

import type { Series } from "~/lib/history";

import { shared } from "./shared-styles";

defineChartElement();

export interface TimeSeries {
  readonly label: string;
  readonly samples: Series;
}

interface Row {
  readonly id: string;
  /** Seconds before the newest sample, as a negative number. */
  readonly seconds: number;
  readonly value: number;
  readonly series: string;
}

/** The narrowest time span a chart shows, in seconds. */
const minimumWindow = 60;

/** How long before the newest reading, such as "45s" or "12m". */
const agoTick = (seconds: number) => {
  const ago = Math.round(-seconds);

  if (ago === 0) return "now";

  return ago < 120 ? `${ago}s` : `${Math.round(ago / 60)}m`;
};

/**
 * Recent readings over time, drawn with TanStack Charts. One series gets a
 * filled area; several get a line each, coloured from the theme's chart
 * palette, with a legend.
 */
@customElement("sb-timeseries")
export class SbTimeseries extends LitElement {
  static override styles = [
    shared,
    css`
      :host {
        display: block;
        min-width: 0;
        font-size: var(--sb-font-size-xs);
        color: var(--sb-color-muted);
      }

      .legend {
        display: flex;
        flex-wrap: wrap;
        gap: var(--sb-space-1) var(--sb-space-4);
        margin-bottom: var(--sb-space-2);
      }

      .legend span {
        display: inline-flex;
        align-items: center;
        gap: var(--sb-space-1-5);
        color: var(--sb-color-text);
      }

      .legend i {
        width: 0.625rem;
        height: 0.625rem;
        border-radius: 0.1875rem;
      }

      .waiting {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--sb-space-4);
        text-align: center;
        text-wrap: balance;
        color: var(--sb-color-muted);
        border: 1px dashed var(--sb-color-border);
        border-radius: var(--sb-radius-m);
      }
    `,
  ];

  @property({ attribute: false }) series: readonly TimeSeries[] = [];

  /** Formats values on the axis and in the tooltip. */
  @property({ attribute: false }) format: (value: number) => string = (value) =>
    value.toFixed(0);

  /** Fixes the top of the scale, such as 100 for percentages. */
  @property({ type: Number }) max: number | undefined = undefined;

  @property({ type: Number }) height = 180;

  @property() label = "";

  #options: object | undefined;

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (
      changed.has("series") ||
      changed.has("max") ||
      changed.has("height") ||
      changed.has("format") ||
      changed.has("label")
    ) {
      this.#options = this.#build();
    }
  }

  #build() {
    const newest = Math.max(
      0,
      ...this.series.map((series) => series.samples.at(-1)?.time ?? 0),
    );

    const rows: Row[] = this.series.flatMap((series) =>
      series.samples.map((sample) => ({
        id: `${series.label}-${sample.time}`,
        seconds: (sample.time - newest) / 1000,
        value: sample.value,
        series: series.label,
      })),
    );

    const single = this.series.length === 1;
    const format = this.format;

    // At least a minute across, so a few seconds of history isn't stretched
    // over the whole width; new readings grow in from the right
    const oldest = Math.min(-minimumWindow, ...rows.map((row) => row.seconds));

    // Configured instances keep their domain; factories would infer one
    const y =
      this.max === undefined
        ? scaleLinear
        : scaleLinear().domain([0, this.max]);

    const definition = defineChart({
      marks: [
        ...(single
          ? [
              areaY(rows, {
                x: "seconds",
                y1: 0,
                y2: "value",
                fillOpacity: 0.14,
              }),
            ]
          : []),
        lineY(rows, {
          x: "seconds",
          y: "value",
          z: "series",
          strokeWidth: 2,
        }),
        crosshair({ x: true, y: false }),
      ],
      scales: {
        x: {
          scale: scaleLinear().domain([oldest, 0]),
          axis: {
            ticks: { format: agoTick, size: 0 },
            // Start the oldest label at the axis, clear of the y labels
            tickLabels: {
              anchor: ({ index }) => (index === 0 ? "start" : undefined),
            },
            line: false,
          },
        },
        y: {
          scale: y,
          nice: this.max === undefined,
          grid: true,
          axis: { ticks: { format, size: 0 }, line: false },
        },
      },
      focus: "nearest-x",
      tooltip: {
        use: tooltip,
        format: (point) =>
          `${single ? "" : `${point.groupLabel}: `}${format(point.datum.value)} · ${agoTick(point.datum.seconds)}`,
      },
    });

    return {
      definition,
      ariaLabel: this.label || "Recent readings",
      height: this.height,
    };
  }

  override render() {
    const hasData = this.series.some((series) => series.samples.length > 1);

    const legend = this.series.map(
      (series, index) =>
        html`<span
          ><i style="background: var(--sb-color-chart-${(index % 6) + 1})"></i
          >${series.label}</span
        >`,
    );

    // What the chart shows, for screen readers: each line's latest reading
    const latest = this.series
      .flatMap((series) => {
        const last = series.samples.at(-1);

        return last === undefined
          ? []
          : [`${series.label} ${this.format(last.value)}`];
      })
      .join(", ");

    return html`
      ${
        this.series.length > 1
          ? html`<div class="legend" aria-hidden="true">${legend}</div>`
          : nothing
      }
      ${
        hasData
          ? html`<div
              role="img"
              aria-label=${`${this.label}${latest ? `. Latest: ${latest}` : ""}`}
            >
              <tanstack-chart
                aria-hidden="true"
                .options=${this.#options}
              ></tanstack-chart>
            </div>`
          : html`<div
              class="waiting small"
              role="status"
              style="height: ${this.height}px"
            >
              The graph starts with the next reading. System Bridge updates most
              data about once a minute.
            </div>`
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-timeseries": SbTimeseries;
  }
}
