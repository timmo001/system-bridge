import type { ModulesData } from "@timmo001/effect-system-bridge";

import { css, html, nothing, type TemplateResult } from "lit";

import type { DataTableState } from "~/components/sb-data-table";
import type { TimeSeries } from "~/components/sb-timeseries";
import { gpuHistory, type MetricHistory, type Series } from "~/lib/history";
import { type LocationOf, type ModuleSearch, updateSearch } from "~/lib/router";

export interface DashboardContext {
  readonly data: ModulesData;
  readonly history: MetricHistory;
  readonly location: LocationOf<"module">;
}

/** Styles for the dashboards, on top of the shared ones. */
export const dashboardStyles = css`
  .dashboard {
    display: grid;
    gap: var(--sb-space-4);
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }

  .dashboard > * {
    grid-column: span 12;
  }

  @media (min-width: 56rem) {
    .dashboard > .half {
      grid-column: span 6;
    }

    .dashboard > .third {
      grid-column: span 4;
    }

    .dashboard > .two-thirds {
      grid-column: span 8;
    }
  }

  .gauges {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-around;
    gap: var(--sb-space-4);
  }

  .meters {
    display: grid;
    gap: var(--sb-space-3) var(--sb-space-6);
    grid-template-columns: repeat(
      auto-fill,
      minmax(min(100%, var(--sb-meters-min, 14rem)), 1fr)
    );
  }

  .meters.compact {
    --sb-meters-min: 7.5rem;
    --sb-meter-height: 0.375rem;
    column-gap: var(--sb-space-4);
  }

  .audio-devices > * + * {
    margin-top: var(--sb-space-3);
    padding-top: var(--sb-space-3);
    border-top: 1px solid var(--sb-color-border);
  }

  .stat {
    display: flex;
    flex-direction: column;
    gap: var(--sb-space-0-5);
  }

  .stat .value {
    overflow-wrap: anywhere;
    font-size: var(--sb-font-size-xl);
    font-weight: var(--sb-font-weight-semibold);
    font-variant-numeric: tabular-nums;
  }

  .stat .name {
    font-size: var(--sb-font-size-xs);
    color: var(--sb-color-muted);
  }

  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sb-space-4);
  }

  /* Each stat takes its natural width, so a long value moves to its own line
     before it wraps */
  .stats > .stat {
    flex: 1 1 auto;
    min-width: 8rem;
  }

  .list {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .list > li {
    display: flex;
    align-items: center;
    gap: var(--sb-space-3);
    padding: var(--sb-space-2-5, 0.625rem) 0;
    font-size: var(--sb-font-size-s);
  }

  .list > li + li {
    border-top: 1px solid var(--sb-color-border);
  }

  .placeholder {
    min-height: var(--sb-placeholder-height, 14rem);
    border-radius: var(--sb-radius-l);
  }
`;

export interface GraphCard {
  readonly heading: string;
  readonly subheading?: string;
  /** Describes the graph for screen readers. */
  readonly label: string;
  readonly series: readonly TimeSeries[];
  readonly format: (value: number) => string;
  /** Fixes the top of the scale, such as 100 for percentages. */
  readonly max?: number;
  readonly height?: number;
  /** The card's width in the dashboard grid. */
  readonly width?: "half" | "third" | "two-thirds" | "full";
}

/** A card with a graph of readings over time. */
export const graphCard = (graph: GraphCard) =>
  html`<sb-card
    class=${graph.width === "full" ? "" : (graph.width ?? "half")}
    heading=${graph.heading}
    subheading=${graph.subheading ?? ""}
  >
    <sb-timeseries
      label=${graph.label}
      .series=${graph.series}
      .format=${graph.format}
      .max=${graph.max}
      .height=${graph.height ?? 180}
    ></sb-timeseries>
  </sb-card>`;

/**
 * Whether a graph has anything to show: a current reading, or readings
 * recorded before. Graphs for things this system doesn't report are left out.
 */
export const hasReadings = (
  current: number | null | undefined,
  ...series: readonly Series[]
) =>
  (current !== null && current !== undefined) ||
  series.some((samples) => samples.length > 0);

/** The CPU's and each GPU's temperature, where they're reported. */
export const temperatureSeries = (
  data: ModulesData,
  history: MetricHistory,
): readonly TimeSeries[] => [
  ...(hasReadings(data.cpu?.temperature, history.cpuTemperature)
    ? [{ label: "CPU", samples: history.cpuTemperature }]
    : []),
  ...(data.gpus ?? []).flatMap((gpu) => {
    const samples = gpuHistory(history, gpu.id).temperature;

    return hasReadings(gpu.temperature, samples)
      ? [{ label: gpu.name, samples }]
      : [];
  }),
];

/** The system's, the CPU's and each GPU's power, where they're reported. */
export const powerSeries = (
  data: ModulesData,
  history: MetricHistory,
): readonly TimeSeries[] => [
  ...(hasReadings(data.system?.power_usage, history.systemPower)
    ? [{ label: "System", samples: history.systemPower }]
    : []),
  ...(hasReadings(data.cpu?.power, history.cpuPower)
    ? [{ label: "CPU", samples: history.cpuPower }]
    : []),
  ...(data.gpus ?? []).flatMap((gpu) => {
    const samples = gpuHistory(history, gpu.id).power;

    return hasReadings(gpu.power_usage, samples)
      ? [{ label: gpu.name, samples }]
      : [];
  }),
];

/** The formatters' text for a value that isn't known. */
const missing = (value: string | number | TemplateResult | null | undefined) =>
  value === null || value === undefined || value === "" || value === "-";

/**
 * A label and value, for a row of key figures. A figure with no value is left
 * out rather than shown as a dash.
 */
export const stat = (name: string, value: string | TemplateResult) =>
  missing(value)
    ? nothing
    : html`<div class="stat">
        <span class="value">${value}</span><span class="name">${name}</span>
      </div>`;

/**
 * Label and value pairs. Pairs with no value are left out, so a module that
 * doesn't report something on this platform doesn't show an empty row.
 */
export const facts = (
  rows: readonly (readonly [
    string,
    string | number | TemplateResult | null | undefined,
  ])[],
) => {
  const shown = rows.flatMap(([label, value]) =>
    missing(value)
      ? []
      : [
          html`<dt>${label}</dt>
            <dd>${value}</dd>`,
        ],
  );

  return shown.length === 0 ? nothing : html`<dl class="facts">${shown}</dl>`;
};

export const yesNo = (value: boolean | null | undefined) =>
  value === null || value === undefined ? null : value ? "Yes" : "No";

/** Shown when a module has no data on this system. */
export const noData = (what: string) =>
  html`<sb-card>
    <div class="empty">
      <p>No ${what} reported on this system.</p>
    </div>
  </sb-card>`;

/** A table's state from the page's URL, with defaults for what's missing. */
export const tableState = (
  search: ModuleSearch,
  defaults: {
    readonly sort: string;
    readonly descending: boolean;
  },
): DataTableState => ({
  filter: search.q ?? "",
  sort: search.sort ?? defaults.sort,
  descending:
    search.order === undefined ? defaults.descending : search.order === "desc",
  page: search.page ?? 1,
  pageSize: search.size,
});

/**
 * Keeps a table's changes in the URL, so a reload or a shared link shows the
 * same rows. Typing in the search replaces the history entry instead of
 * adding one for every key.
 */
export const onTableChange =
  (location: LocationOf<"module">) =>
  (event: CustomEvent<Partial<DataTableState>>) => {
    const { filter, sort, descending, page, pageSize } = event.detail;
    const current = location.search;

    // Unchanged parts keep their value; an empty search or the first page
    // drops out of the URL
    updateSearch(
      location,
      {
        q: filter === undefined ? current.q : filter || undefined,
        sort: sort ?? current.sort,
        order:
          descending === undefined
            ? current.order
            : descending
              ? "desc"
              : "asc",
        page: page === undefined ? current.page : page === 1 ? undefined : page,
        size: pageSize ?? current.size,
      },
      { replace: filter !== undefined },
    );
  };
