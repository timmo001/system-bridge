import {
  type CliRenderer,
  BoxRenderable,
  ScrollBoxRenderable,
  TextRenderable,
  type KeyEvent,
  t,
  fg,
} from "@opentui/core";
import Fuse from "fuse.js";
import type { MenuItem } from "../types.js";
import type { Theme } from "../theme.js";

/** Width of the left icon column in characters */
const ICON_COLUMN_WIDTH = 4;

/** Internal state for a single rendered menu row */
interface MenuRow {
  readonly container: BoxRenderable;
  readonly iconCol: BoxRenderable;
  readonly iconText: TextRenderable;
  readonly titleText: TextRenderable;
  readonly descText: TextRenderable;
  readonly item: MenuItem;
}

/** Configuration for the {@link MenuList} component */
export interface MenuListOptions {
  /** Unique renderable ID */
  readonly id: string;
  /** Menu items to display */
  readonly items: readonly MenuItem[];
  /** Active colour theme */
  readonly theme: Theme;
  /** Called when the user presses Enter on an item */
  readonly onSelect: (item: MenuItem) => void;
  /** Called when the highlighted item changes */
  readonly onSelectionChanged?: (item: MenuItem) => void;
  /** Called when filter text changes (for external display) */
  readonly onFilterChange?: (filter: string) => void;
  /** Called when Escape is pressed with an empty filter */
  readonly onEscape?: () => void;
  /** Called when Backspace is pressed with an empty filter */
  readonly onBack?: () => void;
  /** Index of the initially selected item */
  readonly initialSelectedIndex?: number;
  /** Whether navigation wraps around (default: true) */
  readonly wrapSelection?: boolean;
}

/**
 * Custom menu list with left-aligned full-height icons, vertical scrolling,
 * and walker-style fuzzy type-to-filter.
 *
 * Each item renders as a two-line row:
 * - Line 1: icon character + title text
 * - Line 2: blank icon column + description text
 *
 * Typing any printable character accumulates a fuzzy filter query
 * (powered by Fuse.js with weighted keys). Escape clears the filter;
 * Backspace removes the last character.
 */
export class MenuList extends ScrollBoxRenderable {
  private _allItems: readonly MenuItem[];
  private _items: readonly MenuItem[];
  private _selectedIndex: number;
  private readonly _wrapSelection: boolean;
  private _rows: MenuRow[] = [];
  private readonly _selectCb: (item: MenuItem) => void;
  private readonly _selectionChangedCb?: (item: MenuItem) => void;
  private readonly _onFilterChange?: (filter: string) => void;
  private readonly _onEscape?: () => void;
  private readonly _onBack?: () => void;
  private readonly _renderer: CliRenderer;
  private readonly _theme: Theme;

  private _filterText = "";
  private _fuse: Fuse<MenuItem>;

  constructor(renderer: CliRenderer, options: MenuListOptions) {
    super(renderer, {
      id: options.id,
      flexGrow: 1,
      width: "100%",
      scrollY: true,
      scrollX: false,
      backgroundColor: options.theme.bgElevated,
      focusable: true,
    });

    this._renderer = renderer;
    this._theme = options.theme;
    this._allItems = options.items;
    this._items = options.items;
    this._selectedIndex = options.initialSelectedIndex ?? 0;
    this._wrapSelection = options.wrapSelection ?? true;
    this._selectCb = options.onSelect;
    this._selectionChangedCb = options.onSelectionChanged;
    this._onFilterChange = options.onFilterChange;
    this._onEscape = options.onEscape;
    this._onBack = options.onBack;

    this._fuse = this._createFuse(options.items);
    this._buildRows();
  }

  /** Replace displayed items and reset selection and filter to the top */
  setItems(items: readonly MenuItem[]): void {
    this._clearRows();
    this._allItems = items;
    this._items = items;
    this._filterText = "";
    this._fuse = this._createFuse(items);
    this._selectedIndex = 0;
    this._buildRows();
    this._onFilterChange?.("");
  }

  /** Programmatically select an item by index */
  setSelectedIndex(index: number): void {
    if (
      index < 0 ||
      index >= this._items.length ||
      index === this._selectedIndex
    )
      return;
    this._applySelection(index);
  }

  /** Return the currently highlighted item */
  getSelectedItem(): MenuItem | undefined {
    return this._items[this._selectedIndex];
  }

  /** Clear the filter and restore the full item list */
  resetFilter(): void {
    if (this._filterText.length === 0) return;
    this._filterText = "";
    this._applyFilter();
  }

  /** Whether a filter query is currently active */
  get hasFilter(): boolean {
    return this._filterText.length > 0;
  }

  // -- Keyboard handling ------------------------------------------------

  handleKeyPress(key: KeyEvent): boolean {
    // Escape: clear filter → or fire onEscape callback
    if (key.name === "escape") {
      if (this._filterText.length > 0) {
        this._filterText = "";
        this._applyFilter();
        return true;
      }
      if (this._onEscape) {
        this._onEscape();
        return true;
      }
      return false;
    }

    // Backspace: remove last filter char → or fire onBack callback
    if (key.name === "backspace") {
      if (this._filterText.length > 0) {
        this._filterText = this._filterText.slice(0, -1);
        this._applyFilter();
        return true;
      }
      if (this._onBack) {
        this._onBack();
        return true;
      }
      return false;
    }

    // Arrow navigation
    if (key.name === "up") {
      this._moveSelection(-1);
      return true;
    }
    if (key.name === "down") {
      this._moveSelection(1);
      return true;
    }

    // Enter: select highlighted item
    if (key.name === "return") {
      const item = this._items[this._selectedIndex];
      if (item) this._selectCb(item);
      return true;
    }

    // Printable character → fuzzy filter
    if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
      const ch = key.sequence;
      if (ch >= " ") {
        this._filterText += ch;
        this._applyFilter();
        return true;
      }
    }

    return super.handleKeyPress(key);
  }

  // -- Private helpers --------------------------------------------------

  /** Create a Fuse.js instance for the given item set */
  private _createFuse(items: readonly MenuItem[]): Fuse<MenuItem> {
    return new Fuse([...items], {
      keys: [
        { name: "title", weight: 4 },
        { name: "keywords", weight: 1.5 },
        { name: "description", weight: 1 },
      ],
      threshold: 0.4,
      ignoreLocation: true,
    });
  }

  /** Re-filter visible items from the full set using current filter text */
  private _applyFilter(): void {
    this._clearRows();
    if (this._filterText.length === 0) {
      // Restoring full list — preserve selected item position
      const currentItem = this._items[this._selectedIndex];
      this._items = this._allItems;
      const preservedIndex = currentItem
        ? this._items.indexOf(currentItem)
        : -1;
      this._selectedIndex = preservedIndex >= 0 ? preservedIndex : 0;
    } else {
      // Filtering — always select top result
      this._items = this._fuse.search(this._filterText).map((r) => r.item);
      this._selectedIndex = 0;
    }
    this._buildRows();
    this._onFilterChange?.(this._filterText);
  }

  private _moveSelection(delta: number): void {
    const len = this._items.length;
    if (len === 0) return;

    let next = this._selectedIndex + delta;
    if (this._wrapSelection) {
      if (next < 0) next = len - 1;
      else if (next >= len) next = 0;
    } else {
      next = Math.max(0, Math.min(len - 1, next));
    }
    if (next !== this._selectedIndex) this._applySelection(next);
  }

  private _applySelection(newIndex: number): void {
    const oldRow = this._rows[this._selectedIndex];
    const newRow = this._rows[newIndex];
    if (oldRow) this._styleRow(oldRow, false);
    if (newRow) this._styleRow(newRow, true);
    this._selectedIndex = newIndex;
    // Scroll the selected item into view
    if (newRow) this.scrollChildIntoView(newRow.container.id);
    const item = this._items[newIndex];
    if (item) this._selectionChangedCb?.(item);
  }

  private _clearRows(): void {
    for (const row of this._rows) {
      this.remove(row.container.id);
    }
    this._rows = [];
  }

  private _buildRows(): void {
    for (let i = 0; i < this._items.length; i++) {
      const item = this._items[i];
      const isSelected = i === this._selectedIndex;
      const row = this._createRow(item, i, isSelected);
      this._rows.push(row);
      this.add(row.container);
    }
  }

  private _createRow(
    item: MenuItem,
    index: number,
    isSelected: boolean,
  ): MenuRow {
    const th = this._theme;
    const id = `${this.id}-row-${index}`;
    const bgColor = isSelected ? th.bgSelected : th.bgElevated;
    const textColor = isSelected ? th.accent : th.fg;
    const descColor = isSelected ? th.fgMuted : th.fgMuted;

    // Row container — horizontal layout, full width
    const container = new BoxRenderable(this._renderer, {
      id,
      flexDirection: "row",
      width: "100%",
      flexShrink: 0,
      backgroundColor: bgColor,
    });

    // Icon column — fixed width, icon on the top row spanning full height
    const iconCol = new BoxRenderable(this._renderer, {
      id: `${id}-icol`,
      width: ICON_COLUMN_WIDTH,
      paddingLeft: 1,
    });
    const iconText = new TextRenderable(this._renderer, {
      id: `${id}-icon`,
      content: t`${fg(textColor)(item.icon)}`,
    });
    iconCol.add(iconText);
    container.add(iconCol);

    // Text column — title + description stacked vertically
    const textCol = new BoxRenderable(this._renderer, {
      id: `${id}-tcol`,
      flexGrow: 1,
      flexDirection: "column",
    });
    const titleText = new TextRenderable(this._renderer, {
      id: `${id}-title`,
      content: t`${fg(textColor)(item.title)}`,
    });
    const descText = new TextRenderable(this._renderer, {
      id: `${id}-desc`,
      content: t`${fg(descColor)(item.description)}`,
    });
    textCol.add(titleText);
    textCol.add(descText);
    container.add(textCol);

    return { container, iconCol, iconText, titleText, descText, item };
  }

  private _styleRow(row: MenuRow, selected: boolean): void {
    const th = this._theme;
    const bg = selected ? th.bgSelected : th.bgElevated;
    const textColor = selected ? th.accent : th.fg;
    const descColor = selected ? th.fgMuted : th.fgMuted;

    row.container.backgroundColor = bg;
    row.iconText.content = t`${fg(textColor)(row.item.icon)}`;
    row.titleText.content = t`${fg(textColor)(row.item.title)}`;
    row.descText.content = t`${fg(descColor)(row.item.description)}`;
  }
}
