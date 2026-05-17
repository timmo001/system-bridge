import {
  type CliRenderer,
  BoxRenderable,
  TextRenderable,
  t,
  fg,
} from "@opentui/core";
import type { MenuItem } from "../types.js";
import type { Theme } from "../theme.js";
import { submenus, submenuTitles } from "../menu.js";
import { formatBreadcrumb } from "./breadcrumb.js";
import { formatHelpBar, GLOBAL_HELP, type HelpEntry } from "./helpBar.js";
import { MenuList } from "./MenuList.js";

/** Help entries for submenus */
const HELP: readonly HelpEntry[] = [
  { key: "↑↓", action: "navigate" },
  { key: "Enter", action: "select" },
  { key: "type", action: "filter" },
  { key: "Esc", action: "back" },
  { key: "Backspace", action: "back" },
  ...GLOBAL_HELP,
];

/** Configuration callbacks for the submenu view */
export interface SubMenuOptions {
  /** Called when the user selects a non-submenu action item */
  readonly onAction: (item: MenuItem) => void;
  /** Called when the user navigates back from the root submenu */
  readonly onBack: () => void;
}

/**
 * Generic nested submenu view with breadcrumb navigation and type-to-filter.
 *
 * Supports arbitrary depth of nested submenus using the global submenu registry.
 * Breadcrumbs show the full path: System Bridge > Client > Data
 */
export class SubMenu {
  private renderer: CliRenderer;
  private theme: Theme;
  private callbacks: SubMenuOptions;

  private root: BoxRenderable;
  private titleText: TextRenderable;
  private filterBar: TextRenderable;
  private menuList: MenuList;
  private helpBar: TextRenderable;

  /** Stack of submenu IDs for nested navigation */
  private menuStack: string[] = [];
  private rootMenuId: string;
  private currentMenuId: string;
  private isVisible = false;

  constructor(
    renderer: CliRenderer,
    theme: Theme,
    rootMenuId: string,
    options: SubMenuOptions,
  ) {
    this.renderer = renderer;
    this.theme = theme;
    this.callbacks = options;
    this.rootMenuId = rootMenuId;
    this.currentMenuId = rootMenuId;

    this.root = new BoxRenderable(renderer, {
      id: `submenu-${rootMenuId}-root`,
      flexDirection: "column",
      width: "100%",
      height: "100%",
      padding: 1,
    });

    // Title (dynamic based on submenu depth)
    this.titleText = new TextRenderable(renderer, {
      id: `submenu-${rootMenuId}-title`,
      content: this.formatTitle(),
      marginBottom: 1,
    });
    this.root.add(this.titleText);

    // Filter bar
    this.filterBar = new TextRenderable(renderer, {
      id: `submenu-${rootMenuId}-filter`,
      content: t`${fg(theme.fgSubtle)("/")}`,
      marginBottom: 1,
    });
    this.root.add(this.filterBar);

    // Menu list
    const initialItems = submenus.get(rootMenuId) ?? [];
    this.menuList = this.createMenuList(initialItems);
    this.root.add(this.menuList);

    // Help bar
    this.helpBar = new TextRenderable(renderer, {
      id: `submenu-${rootMenuId}-help`,
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

  /** Navigate into a nested submenu */
  pushSubmenu(menuId: string): void {
    this.menuStack.push(this.currentMenuId);
    this.loadMenu(menuId);
  }

  /** Reset to the root submenu */
  resetToRoot(): void {
    this.menuStack = [];
    this.loadMenu(this.rootMenuId);
  }

  /** Show or hide the submenu view */
  setVisible(visible: boolean): void {
    this.root.visible = visible;
    this.isVisible = visible;
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

  /** Remove keyboard focus */
  blur(): void {
    this.menuList.blur();
  }

  private handleBack(): void {
    const prev = this.menuStack.pop();
    if (prev) {
      this.loadMenu(prev);
    } else {
      this.callbacks.onBack();
    }
  }

  private loadMenu(menuId: string): void {
    const items = submenus.get(menuId);
    if (!items) return;

    this.currentMenuId = menuId;

    // Update title
    this.titleText.content = this.formatTitle();

    // Reset filter bar
    this.filterBar.content = t`${fg(this.theme.fgSubtle)("/")}`;

    // Recreate menu list with new items
    this.root.remove(this.menuList.id);
    this.menuList = this.createMenuList(items);
    this.root.insertBefore(this.menuList, this.helpBar);
    this.menuList.focus();
  }

  private createMenuList(items: readonly MenuItem[]): MenuList {
    return new MenuList(this.renderer, {
      id: `submenu-${this.rootMenuId}-list`,
      items,
      theme: this.theme,
      onSelect: (item) => {
        if (
          item.action.type === "submenu" &&
          submenus.has(item.action.menuId)
        ) {
          this.pushSubmenu(item.action.menuId);
        } else {
          this.callbacks.onAction(item);
        }
      },
      onFilterChange: (filter) => this.updateFilterBar(filter),
      onEscape: () => this.handleBack(),
      onBack: () => this.handleBack(),
      wrapSelection: true,
    });
  }

  private updateFilterBar(filter: string): void {
    if (filter.length === 0) {
      this.filterBar.content = t`${fg(this.theme.fgSubtle)("/")}`;
    } else {
      this.filterBar.content = t`${fg(this.theme.accent)("/")} ${fg(this.theme.fg)(filter)}`;
    }
  }

  private formatTitle() {
    const parts = ["System Bridge"];

    // Add root menu title
    const rootTitle = submenuTitles.get(this.rootMenuId) ?? this.rootMenuId;
    parts.push(rootTitle);

    // Add intermediate stack entries
    for (const menuId of this.menuStack) {
      if (menuId !== this.rootMenuId) {
        const title = submenuTitles.get(menuId) ?? menuId;
        parts.push(title);
      }
    }

    // Add current if different from root and not already added
    if (this.currentMenuId !== this.rootMenuId) {
      const title = submenuTitles.get(this.currentMenuId) ?? this.currentMenuId;
      if (parts[parts.length - 1] !== title) {
        parts.push(title);
      }
    }

    return formatBreadcrumb(this.theme, parts);
  }

  /** Remove the submenu from the render tree */
  destroy(): void {
    this.renderer.root.remove(this.root.id);
  }
}
