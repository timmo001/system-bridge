import {
  type CliRenderer,
  BoxRenderable,
  TextRenderable,
  t,
  bold,
  fg,
} from "@opentui/core";
import type { MenuItem } from "../types.js";
import type { Theme } from "../theme.js";
import { mainMenuItems } from "../menu.js";
import { formatHelpBar, GLOBAL_HELP, type HelpEntry } from "./helpBar.js";
import { MenuList } from "./MenuList.js";

/** Help entries for the main menu */
const HELP: readonly HelpEntry[] = [
  { key: "↑↓", action: "navigate" },
  { key: "Enter", action: "select" },
  { key: "type", action: "filter" },
  ...GLOBAL_HELP,
];

/** Configuration callbacks for the main menu */
export interface MainMenuOptions {
  /** Called when the user selects a menu item */
  readonly onSelect: (item: MenuItem) => void;
}

/** Top-level menu rendered as a {@link MenuList} with type-to-filter */
export class MainMenu {
  private renderer: CliRenderer;
  private theme: Theme;
  private root: BoxRenderable;
  private menuList: MenuList;
  private filterBar: TextRenderable;
  private helpBar: TextRenderable;
  private callbacks: MainMenuOptions;

  constructor(renderer: CliRenderer, theme: Theme, options: MainMenuOptions) {
    this.renderer = renderer;
    this.theme = theme;
    this.callbacks = options;

    this.root = new BoxRenderable(renderer, {
      id: "main-menu-root",
      flexDirection: "column",
      width: "100%",
      height: "100%",
      padding: 1,
    });

    // Title
    const titleBar = new TextRenderable(renderer, {
      id: "main-menu-title",
      content: t`${bold(fg(theme.accent)("System Bridge"))}${fg(theme.fgMuted)(" — a bridge for your systems")}`,
      marginBottom: 1,
    });
    this.root.add(titleBar);

    // Filter bar — always visible to avoid layout shifts
    this.filterBar = new TextRenderable(renderer, {
      id: "main-menu-filter",
      content: t`${fg(theme.fgSubtle)("/")}`,
      marginBottom: 1,
    });
    this.root.add(this.filterBar);

    // Menu list
    this.menuList = new MenuList(renderer, {
      id: "main-menu-list",
      items: mainMenuItems,
      theme,
      onSelect: (item) => {
        this.callbacks.onSelect(item);
      },
      onFilterChange: (filter) => this.updateFilterBar(filter),
      onEscape: () => {
        // Escape on main menu with empty filter — no-op (quit via Ctrl+c)
      },
      initialSelectedIndex: 0,
      wrapSelection: true,
    });
    this.root.add(this.menuList);

    // Help bar
    this.helpBar = new TextRenderable(renderer, {
      id: "main-menu-help",
      content: formatHelpBar(theme, HELP),
      marginTop: 1,
    });
    this.root.add(this.helpBar);

    renderer.root.add(this.root);

    // Re-wrap help bar on terminal resize
    renderer.on("resize", () => {
      this.helpBar.content = formatHelpBar(this.theme, HELP);
    });
  }

  /** Show or hide the main menu view */
  setVisible(visible: boolean): void {
    this.root.visible = visible;
  }

  /** Give keyboard focus to the menu list */
  focus(): void {
    this.menuList.focus();
  }

  /** Reset filter state and give keyboard focus */
  resetAndFocus(): void {
    this.menuList.resetFilter();
    this.menuList.focus();
  }

  /** Remove keyboard focus from the menu list */
  blur(): void {
    this.menuList.blur();
  }

  /** Remove the main menu from the render tree */
  destroy(): void {
    this.renderer.root.remove(this.root.id);
  }

  /** Update the filter bar display based on current filter text */
  private updateFilterBar(filter: string): void {
    if (filter.length === 0) {
      this.filterBar.content = t`${fg(this.theme.fgSubtle)("/")}`;
    } else {
      this.filterBar.content = t`${fg(this.theme.accent)("/")} ${fg(this.theme.fg)(filter)}`;
    }
  }
}
