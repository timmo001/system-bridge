import { areaY, defineChart, lineY } from "@tanstack/charts";
import { crosshair } from "@tanstack/charts/crosshair";
import { defineChartElement } from "@tanstack/charts/lit";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import { Schema } from "effect";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";

import { AtomController } from "~/controllers/atom-controller";
import { registry } from "~/lib/atoms";
import type { Series } from "~/lib/history";
import { HistoryRange, historyRange } from "~/lib/preferences";

import "@timmo001/groundwork-ui/gw-segmented.ts";
import type { Segment } from "@timmo001/groundwork-ui/gw-segmented.ts";
import { selectValue } from "~/lib/select";
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
  /** The same, in the axis's unit. */
  readonly x: number;
  readonly value: number;
  readonly series: string;
}

interface ShownSeries {
  readonly label: string;
  readonly samples: Series;
  readonly average: number;
  readonly peak: number;
}

/** The narrowest time span a chart shows, in seconds. */
const minimumWindow = 60;

/** Each range's span in seconds, and how it reads in a sentence. */
const ranges: Record<HistoryRange, { seconds: number; text: string }> = {
  "1h": { seconds: 60 * 60, text: "last hour" },
  "6h": { seconds: 6 * 60 * 60, text: "last 6 hours" },
  "24h": { seconds: 24 * 60 * 60, text: "last 24 hours" },
};

const rangeOptions: readonly Segment[] = HistoryRange.literals.map((range) => ({
  value: range,
  label: range,
}));

const isHistoryRange = Schema.is(HistoryRange);

/** How long before the newest reading, such as "45s", "12m" or "3h". */
const agoTick = (seconds: number) => {
  const ago = Math.round(-seconds);

  if (ago === 0) return "now";

  if (ago < 60) return `${ago}s`;

  return ago < 7200 ? `${Math.round(ago / 60)}m` : `${Math.round(ago / 3600)}h`;
};

/**
 * The time axis's unit for a span in seconds. The axis counts in it, so its
 * evenly spaced ticks land on whole minutes or hours rather than odd seconds.
 */
const axisUnit = (span: number) =>
  span <= 180
    ? { seconds: 1, suffix: "s" }
    : span <= 3 * 60 * 60
      ? { seconds: 60, suffix: "m" }
      : { seconds: 60 * 60, suffix: "h" };

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
        font-size: var(--gw-font-size-xs);
        color: var(--gw-color-text-secondary);
      }

      .toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--gw-space-2) var(--gw-space-4);
        margin-bottom: var(--gw-space-2);
      }

      .legend {
        display: flex;
        flex-wrap: wrap;
        gap: var(--gw-space-1) var(--gw-space-4);
      }

      .toolbar gw-segmented {
        margin-inline-start: auto;
      }

      .legend span {
        display: inline-flex;
        align-items: center;
        gap: calc(var(--gw-space-1) * 1.5);
        color: var(--gw-color-text-primary);
      }

      .legend i {
        width: 0.625rem;
        height: 0.625rem;
        border-radius: 0.1875rem;
      }

      .summary {
        display: flex;
        flex-wrap: wrap;
        gap: var(--gw-space-1) var(--gw-space-4);
        margin: var(--gw-space-2) 0 0;
        padding: 0;
        list-style: none;
      }

      .summary strong {
        font-weight: var(--gw-font-weight-strong);
        font-variant-numeric: tabular-nums;
        color: var(--gw-color-text-primary);
      }

      .summary span {
        color: var(--gw-color-text-primary);
      }

      .waiting {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--gw-space-4);
        text-align: center;
        text-wrap: balance;
        color: var(--gw-color-text-secondary);
        border: 1px dashed var(--gw-color-border-normal);
        border-radius: var(--gw-radius-m);
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

  readonly #range = new AtomController(this, () => historyRange);

  #options: object | undefined;

  /** The series with readings in range, and their average and peak. */
  #shown: readonly ShownSeries[] = [];

  /** The range the options were built for. */
  #builtRange: HistoryRange | undefined;

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (
      changed.has("series") ||
      changed.has("max") ||
      changed.has("height") ||
      changed.has("format") ||
      changed.has("label") ||
      this.#range.value !== this.#builtRange
    ) {
      this.#builtRange = this.#range.value;
      this.#options = this.#build(this.#builtRange);
    }
  }

  #onRangeChanged = (event: Event) => {
    const range = selectValue(event);

    if (isHistoryRange(range)) registry.set(historyRange, range);
  };

  #build(range: HistoryRange) {
    const newest = Math.max(
      0,
      ...this.series.map((series) => series.samples.at(-1)?.time ?? 0),
    );

    const start = newest - ranges[range].seconds * 1000;

    // Only the series with readings in range, so the legend's colours match
    // the lines the chart draws
    this.#shown = this.series.flatMap((series) => {
      const samples = series.samples.filter((sample) => sample.time >= start);

      if (samples.length === 0) return [];

      const values = samples.map((sample) => sample.value);

      return [
        {
          label: series.label,
          samples,
          average:
            values.reduce((sum, value) => sum + value, 0) / values.length,
          peak: Math.max(...values),
        },
      ];
    });

    // At least a minute across, so a few seconds of history isn't stretched
    // over the whole width; new readings grow in from the right
    const oldestSeconds = Math.min(
      -minimumWindow,
      ...this.#shown.map(
        (series) => ((series.samples[0]?.time ?? newest) - newest) / 1000,
      ),
    );

    const unit = axisUnit(-oldestSeconds);
    const oldest = oldestSeconds / unit.seconds;

    const rows: Row[] = this.#shown.flatMap((series) =>
      series.samples.map((sample) => {
        const seconds = (sample.time - newest) / 1000;

        return {
          id: `${series.label}-${sample.time}`,
          seconds,
          x: seconds / unit.seconds,
          value: sample.value,
          series: series.label,
        };
      }),
    );

    const unitTick = (x: number) => {
      const ago = Math.round(-x * 10) / 10;

      return ago === 0 ? "now" : `${ago}${unit.suffix}`;
    };

    const single = this.#shown.length === 1;
    const format = this.format;

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
                x: "x",
                y1: 0,
                y2: "value",
                fillOpacity: 0.14,
              }),
            ]
          : []),
        lineY(rows, {
          x: "x",
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
            ticks: { format: unitTick, size: 0 },
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
      ariaLabel: `${this.label || "Recent readings"}, ${ranges[range].text}`,
      height: this.height,
    };
  }

  override render() {
    const range = this.#range.value;
    const shown = this.#shown;
    const single = shown.length === 1;
    const hasData = shown.some((series) => series.samples.length > 1);

    const legend = shown.map(
      (series, index) =>
        html`<span
          ><i style="background: var(--sb-color-chart-${(index % 6) + 1})"></i
          >${series.label}</span
        >`,
    );

    // What the chart shows, for screen readers: each line's latest reading
    const latest = shown
      .flatMap((series) => {
        const last = series.samples.at(-1);

        return last === undefined
          ? []
          : [`${series.label} ${this.format(last.value)}`];
      })
      .join(", ");

    const summary = shown.map(
      (series) =>
        html`<li>
          ${single ? nothing : html`<span>${series.label}</span>`} average
          <strong>${this.format(series.average)}</strong>, peak
          <strong>${this.format(series.peak)}</strong>
        </li>`,
    );

    const description = `${this.label}, ${ranges[range].text}`;

    return html`
      ${
        hasData
          ? html`<div class="toolbar">
              ${
                shown.length > 1
                  ? html`<div class="legend" aria-hidden="true">${legend}</div>`
                  : nothing
              }
              <gw-segmented
                label=${`Time range for ${this.label || "the graph"}`}
                size="small"
                .options=${rangeOptions}
                .value=${range}
                @change=${this.#onRangeChanged}
              ></gw-segmented>
            </div>`
          : nothing
      }
      ${
        hasData
          ? html`<div
                role="img"
                aria-label=${`${description}${latest ? `. Latest: ${latest}` : ""}`}
              >
                <tanstack-chart
                  aria-hidden="true"
                  .options=${this.#options}
                ></tanstack-chart>
              </div>
              <ul
                class="summary"
                aria-label=${`Summary, ${ranges[range].text}`}
              >
                ${summary}
              </ul>`
          : html`<div
              class="waiting small"
              role="status"
              style="height: ${this.height}px"
            >
              The graph starts with the next reading. System Bridge records
              about one a minute and keeps 24 hours.
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
