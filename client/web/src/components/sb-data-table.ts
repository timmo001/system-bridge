import {
  mdiArrowDown,
  mdiArrowUp,
  mdiChevronLeft,
  mdiChevronRight,
  mdiMagnify,
  mdiPageFirst,
  mdiPageLast,
} from "@mdi/js";
import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  FlexRender,
  globalFilteringFeature,
  type Header,
  type RowData,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_text,
  TableController,
  tableFeatures,
} from "@tanstack/lit-table";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";

import { icon, shared } from "./shared-styles";

export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  // The functions `sortFn: "auto"` and `globalFilterFn` resolve by name
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    text: sortFn_text,
  },
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: { includesString: filterFn_includesString },
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
});

export type DataTableFeatures = typeof dataTableFeatures;

/** Builds a table's columns with types checked against its rows. */
export const dataTableColumns = <T extends RowData>() =>
  createColumnHelper<DataTableFeatures, T>();

export type DataTableColumns<T extends RowData> = ReturnType<
  ReturnType<typeof dataTableColumns<T>>["columns"]
>;

/** The parts of a table's state its page keeps, such as in the URL. */
export interface DataTableState {
  readonly filter: string;
  readonly sort: string | undefined;
  readonly descending: boolean;
  /** From 1. */
  readonly page: number;
  /** Undefined until chosen, when the table uses the rows saved for it. */
  readonly pageSize: number | undefined;
}

export const pageSizes = [10, 25, 50, 100] as const;

const defaultPageSize = 25;

/** Where a table's chosen rows are kept, by its label. */
const rowsKey = (label: string) => `system-bridge-table-rows:${label}`;

const savedRows = (label: string) => {
  try {
    const rows = Number(localStorage.getItem(rowsKey(label)));

    return pageSizes.find((size) => size === rows);
  } catch {
    return undefined;
  }
};

const saveRows = (label: string, rows: number) => {
  try {
    localStorage.setItem(rowsKey(label), String(rows));
  } catch {
    // The browser may not allow storage; the choice then lasts the page
  }
};

/**
 * Rows in a table that sorts, filters and pages them, built on TanStack
 * Table. Its state belongs to the page, which passes it in and gets changes
 * back from `table-state-change`, so it can keep them in the URL, unless it's
 * `local`.
 *
 * @fires table-state-change - With the parts of the state that changed.
 */
@customElement("sb-data-table")
export class SbDataTable<T extends RowData> extends LitElement {
  static override styles = [
    shared,
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--sb-space-3);
        min-width: 0;
      }

      .toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--sb-space-3);
      }

      .search {
        position: relative;
        flex: 1;
        min-width: min(100%, 14rem);
        max-width: 24rem;
      }

      .search .icon {
        position: absolute;
        top: 50%;
        left: var(--sb-space-3);
        translate: 0 -50%;
        color: var(--sb-color-muted);
        pointer-events: none;
      }

      .search .input {
        padding-left: 2.5rem;
      }

      .scroller {
        overflow-x: auto;
        border: 1px solid var(--sb-color-border);
        border-radius: var(--sb-radius-l);
      }

      table {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--sb-font-size-s);
      }

      th,
      td {
        padding: var(--sb-space-2) var(--sb-space-3);
        text-align: start;
        white-space: nowrap;
        border-bottom: 1px solid var(--sb-color-border);
      }

      tbody tr:last-child td {
        border-bottom: 0;
      }

      tbody tr:hover {
        background: var(--sb-color-hover);
      }

      th {
        position: sticky;
        top: 0;
        height: 2.5rem;
        font-size: var(--sb-font-size-xs);
        font-weight: var(--sb-font-weight-semibold);
        color: var(--sb-color-muted);
        background: var(--sb-color-sunken);
      }

      th button {
        display: inline-flex;
        align-items: center;
        gap: var(--sb-space-1);
        padding: 0;
        font: inherit;
        color: inherit;
        cursor: pointer;
        background: none;
        border: 0;
        --sb-icon-size: 0.875rem;
      }

      th[aria-sort="ascending"] button,
      th[aria-sort="descending"] button {
        color: var(--sb-color-text);
      }

      .numeric {
        text-align: end;
        font-variant-numeric: tabular-nums;
      }

      th.numeric button {
        flex-direction: row-reverse;
      }

      .wide {
        max-width: 28rem;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .pager {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--sb-space-2);
        font-size: var(--sb-font-size-s);
        color: var(--sb-color-muted);
      }

      .pager select {
        width: auto;
        min-height: 2rem;
      }

      .pages {
        display: flex;
        align-items: center;
        gap: var(--sb-space-1);
        white-space: nowrap;
      }

      /* On a phone the search takes the full width, and the page buttons
         get a line of their own */
      @media (width < 40rem) {
        .search {
          flex-basis: 100%;
          max-width: none;
        }

        .pages {
          flex-basis: 100%;
          justify-content: space-between;
        }
      }

      .none {
        padding: var(--sb-space-8);
        color: var(--sb-color-muted);
        text-align: center;
      }
    `,
  ];

  @property({ attribute: false }) columns: DataTableColumns<T> | readonly [] =
    [];

  @property({ attribute: false }) data: readonly T[] = [];

  @property({ attribute: false }) state: DataTableState = {
    filter: "",
    sort: undefined,
    descending: false,
    page: 1,
    pageSize: undefined,
  };

  /** Gives each row a stable identity across updates. */
  @property({ attribute: false }) rowId: (row: T, index: number) => string = (
    _,
    index,
  ) => String(index);

  /** Column IDs whose cells are numbers, aligned to the end. */
  @property({ attribute: false }) numeric: readonly string[] = [];

  /** Column IDs that can be long, truncated with an ellipsis. */
  @property({ attribute: false }) wide: readonly string[] = [];

  @property({ attribute: "search-placeholder" }) searchPlaceholder = "Search";

  @property() label = "";

  /**
   * Keeps its state itself rather than in the page, for a page with more than
   * one table. The state passed in is then where it starts.
   */
  @property({ type: Boolean }) local = false;

  /** A local table's changes to its state. */
  #localChanges: Partial<DataTableState> = {};

  readonly #table = new TableController<DataTableFeatures, T>(this);

  get #state(): DataTableState {
    return this.local ? { ...this.state, ...this.#localChanges } : this.state;
  }

  #change(changes: Partial<DataTableState>) {
    if (this.local) {
      this.#localChanges = { ...this.#localChanges, ...changes };
      this.requestUpdate();

      return;
    }

    this.dispatchEvent(
      new CustomEvent("table-state-change", {
        detail: changes,
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * Sorts by a header's column. The first click uses the column's preferred
   * direction; later clicks flip it.
   */
  #onSortClick = (event: MouseEvent) => {
    if (!(event.currentTarget instanceof HTMLButtonElement)) return;

    const { column, sorted, first } = event.currentTarget.dataset;

    if (column === undefined) return;

    this.#change({
      sort: column,
      descending: sorted === "" ? first === "desc" : sorted === "asc",
      page: 1,
    });
  };

  #onFilterInput = (event: InputEvent) => {
    if (event.target instanceof HTMLInputElement) {
      this.#change({ filter: event.target.value, page: 1 });
    }
  };

  #onPageSizeChange = (event: Event) => {
    if (event.target instanceof HTMLSelectElement) {
      const pageSize = Number(event.target.value);

      if (this.label !== "") saveRows(this.label, pageSize);
      this.#change({ pageSize, page: 1 });
    }
  };

  #onPageClick = (event: MouseEvent) => {
    if (event.currentTarget instanceof HTMLButtonElement) {
      this.#change({ page: Number(event.currentTarget.dataset.page) });
    }
  };

  #renderHeader(header: Header<DataTableFeatures, T>) {
    const column = header.column;
    const sorted = column.getIsSorted();
    const className = this.numeric.includes(column.id) ? "numeric" : "";

    if (header.isPlaceholder) return html`<th></th>`;

    const content = FlexRender({ header });

    return html`
      <th
        class=${className}
        aria-sort=${
          sorted === "asc"
            ? "ascending"
            : sorted === "desc"
              ? "descending"
              : nothing
        }
      >
        ${
          column.getCanSort()
            ? html`<button
                type="button"
                data-column=${column.id}
                data-sorted=${sorted || ""}
                data-first=${column.getFirstSortDir()}
                @click=${this.#onSortClick}
              >
                ${content}
                ${
                  sorted === false
                    ? nothing
                    : icon(sorted === "asc" ? mdiArrowUp : mdiArrowDown)
                }
              </button>`
            : content
        }
      </th>
    `;
  }

  override render() {
    const { filter, sort, descending, page } = this.#state;

    const pageSize =
      this.#state.pageSize ?? savedRows(this.label) ?? defaultPageSize;

    const table = this.#table.table({
      features: dataTableFeatures,
      columns: [...this.columns],
      data: [...this.data],
      getRowId: this.rowId,
      globalFilterFn: "includesString",
      enableSortingRemoval: false,
      state: {
        globalFilter: filter,
        sorting: sort === undefined ? [] : [{ id: sort, desc: descending }],
        pagination: { pageIndex: page - 1, pageSize },
      },
      onGlobalFilterChange: () => undefined,
      onSortingChange: () => undefined,
      onPaginationChange: () => undefined,
    });

    const rows = table.getRowModel().rows;
    const total = table.getFilteredRowModel().rows.length;
    const pages = Math.max(1, table.getPageCount());
    const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const last = Math.min(total, page * pageSize);

    const sizeOptions = pageSizes.map(
      (size) =>
        html`<option value=${size} ?selected=${size === pageSize}>
          ${size}
        </option>`,
    );

    const pageButton = (target: number, label: string, path: string) =>
      html`<button
        class="button plain icon-only small"
        type="button"
        aria-label=${label}
        data-page=${target}
        ?disabled=${target < 1 || target > pages || target === page}
        @click=${this.#onPageClick}
      >
        ${icon(path)}
      </button>`;

    return html`
      <div class="toolbar">
        <label class="search">
          ${icon(mdiMagnify)}
          <input
            class="input"
            type="search"
            aria-label=${this.searchPlaceholder}
            placeholder=${this.searchPlaceholder}
            .value=${filter}
            @input=${this.#onFilterInput}
          />
        </label>
        <span class="spacer"></span>
        <slot name="toolbar"></slot>
      </div>
      <div class="scroller">
        <table aria-label=${this.label || nothing}>
          <thead>
            ${repeat(
              table.getHeaderGroups(),
              (group) => group.id,
              (group) =>
                html`<tr>
                  ${repeat(
                    group.headers,
                    (header) => header.id,
                    (header) => this.#renderHeader(header),
                  )}
                </tr>`,
            )}
          </thead>
          <tbody>
            ${repeat(
              rows,
              (row) => row.id,
              (row) =>
                html`<tr>
                  ${repeat(
                    row.getAllCells(),
                    (cell) => cell.id,
                    (cell) =>
                      html`<td
                        class="${this.numeric.includes(cell.column.id) ? "numeric" : ""} ${this.wide.includes(cell.column.id) ? "wide" : ""}"
                      >
                        ${FlexRender({ cell })}
                      </td>`,
                  )}
                </tr>`,
            )}
          </tbody>
        </table>
        ${
          rows.length === 0
            ? html`<div class="none">
                ${filter === "" ? "Nothing to show" : "No rows match the search"}
              </div>`
            : nothing
        }
      </div>
      <div class="pager">
        <span class="tabular">${first}-${last} of ${total}</span>
        <span class="spacer"></span>
        <label class="row">
          Rows
          <select
            class="input"
            .value=${String(pageSize)}
            @change=${this.#onPageSizeChange}
          >
            ${sizeOptions}
          </select>
        </label>
        <span class="pages">
          ${pageButton(1, "First page", mdiPageFirst)}
          ${pageButton(page - 1, "Previous page", mdiChevronLeft)}
          <span class="tabular">Page ${Math.min(page, pages)} of ${pages}</span>
          ${pageButton(page + 1, "Next page", mdiChevronRight)}
          ${pageButton(pages, "Last page", mdiPageLast)}
        </span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-data-table": SbDataTable<RowData>;
  }

  interface HTMLElementEventMap {
    "table-state-change": CustomEvent<Partial<DataTableState>>;
  }
}
