import type { ModulesData } from "@timmo001/effect-system-bridge";
import { css, html, nothing, type TemplateResult } from "lit";

import type { DataTableState } from "~/components/sb-data-table";
import type { MetricHistory } from "~/lib/history";
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
    display: grid;
    gap: var(--sb-space-4);
    grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
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
    readonly pageSize?: number;
  },
): DataTableState => ({
  filter: search.q ?? "",
  sort: search.sort ?? defaults.sort,
  descending:
    search.order === undefined ? defaults.descending : search.order === "desc",
  page: search.page ?? 1,
  pageSize: search.size ?? defaults.pageSize ?? 25,
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
