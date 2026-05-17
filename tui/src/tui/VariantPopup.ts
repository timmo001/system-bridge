import {
  type CliRenderer,
  BoxRenderable,
  SelectRenderable,
  SelectRenderableEvents,
  TextRenderable,
  type KeyEvent,
  t,
  bold,
  dim,
  fg,
} from "@opentui/core";
import type { MenuAction, MenuItem, MenuVariant } from "../types.js";
import type { Theme } from "../theme.js";

/** Width of the popup box in characters */
const POPUP_WIDTH = 50;

/** Configuration for the {@link VariantPopup} component */
export interface VariantPopupOptions {
  /** Called when the user selects a variant */
  readonly onSelect: (action: MenuAction) => void;
  /** Called when the popup is dismissed without selection */
  readonly onDismiss: () => void;
}

/**
 * Centred popup overlay presenting variant options for a menu item.
 *
 * Opens when a menu item with `variants` is activated. The first variant
 * is pre-selected so Enter→Enter runs the default. Escape dismisses.
 * Uses {@link SelectRenderable} for built-in scroll and selection handling.
 */
export class VariantPopup {
  private renderer: CliRenderer;
  private theme: Theme;
  private root: BoxRenderable;
  private titleText: TextRenderable;
  private select: SelectRenderable;
  private separator: TextRenderable;
  private helpText: TextRenderable;
  private callbacks: VariantPopupOptions;

  private variants: readonly MenuVariant[] = [];

  constructor(
    renderer: CliRenderer,
    theme: Theme,
    options: VariantPopupOptions,
  ) {
    this.renderer = renderer;
    this.theme = theme;
    this.callbacks = options;

    // Outer absolutely positioned container — hidden by default
    this.root = new BoxRenderable(renderer, {
      id: "variant-popup-root",
      position: "absolute",
      width: POPUP_WIDTH,
      zIndex: 150,
      visible: false,
      borderStyle: "rounded",
      borderColor: theme.accent,
      backgroundColor: theme.bgElevated,
      flexDirection: "column",
      paddingLeft: 1,
      paddingRight: 1,
      paddingTop: 0,
      paddingBottom: 0,
    });

    // Title
    this.titleText = new TextRenderable(renderer, {
      id: "variant-popup-title",
      content: t``,
      marginBottom: 1,
    });
    this.root.add(this.titleText);

    // SelectRenderable — built-in scrollable list with selection handling
    this.select = new SelectRenderable(renderer, {
      id: "variant-popup-select",
      options: [],
      selectedIndex: 0,
      wrapSelection: true,
      showDescription: true,
      showScrollIndicator: true,
      backgroundColor: theme.bgElevated,
      textColor: theme.fg,
      descriptionColor: theme.fgMuted,
      selectedBackgroundColor: theme.accent,
      selectedTextColor: theme.accentFg,
      selectedDescriptionColor: theme.fg,
      focusedBackgroundColor: theme.bgElevated,
      focusedTextColor: theme.fg,
      width: "100%",
      flexGrow: 1,
    });
    this.root.add(this.select);

    // Wire selection event
    this.select.on(SelectRenderableEvents.ITEM_SELECTED, () => {
      const opt = this.select.getSelectedOption();
      if (opt) {
        const variant = this.variants[this.select.getSelectedIndex()];
        if (variant) {
          this.hide();
          this.callbacks.onSelect(variant.action);
        }
      }
    });

    // Separator line between list and help
    this.separator = new TextRenderable(renderer, {
      id: "variant-popup-sep",
      content: t`${fg(theme.fgSubtle)("─".repeat(POPUP_WIDTH - 4))}`,
      marginTop: 1,
    });
    this.root.add(this.separator);

    // Help text at the bottom
    this.helpText = new TextRenderable(renderer, {
      id: "variant-popup-help",
      content: t`${dim("↑↓")} ${dim("navigate")}  ${dim("Enter")} ${dim("select")}  ${dim("Esc")} ${dim("cancel")}`,
    });
    this.root.add(this.helpText);

    renderer.root.add(this.root);
  }

  /** Whether the popup is currently visible */
  get visible(): boolean {
    return this.root.visible;
  }

  /**
   * Show the popup for a given menu item's variants.
   *
   * Populates the list, positions the popup centrally, pre-selects index 0,
   * and takes keyboard focus.
   */
  show(item: MenuItem): void {
    const variants = item.variants;
    if (!variants || variants.length === 0) return;

    this.variants = variants;

    // Set title
    this.titleText.content = t`${bold(fg(this.theme.accent)(item.title))}`;

    // Populate select options
    this.select.options = variants.map((v) => ({
      name: v.label,
      description: v.description ?? "",
    }));
    this.select.selectedIndex = 0;

    // Calculate popup height:
    // Each item = 2 lines (name + description) + border(2) + title(1) + titleMargin(1) + sep margin(1) + sep(1) + help(1)
    const itemLines = variants.length * 2;
    const chromeLines = 7;
    const totalHeight = itemLines + chromeLines;

    // Centre vertically and horizontally relative to terminal
    const termHeight = this.renderer.height;
    const termWidth = this.renderer.width;
    const top = Math.max(1, Math.floor((termHeight - totalHeight) / 2));
    const left = Math.max(1, Math.floor((termWidth - POPUP_WIDTH) / 2));

    this.root.top = top;
    this.root.left = left;
    this.root.height = totalHeight;
    this.root.visible = true;
    this.select.focus();
  }

  /** Hide the popup and release focus */
  hide(): void {
    this.root.visible = false;
    this.select.blur();
  }

  /** Handle keyboard input when the popup has focus */
  handleKeyPress(key: KeyEvent): boolean {
    switch (key.name) {
      case "escape":
      case "backspace":
        this.hide();
        this.callbacks.onDismiss();
        return true;
      default:
        // Let the SelectRenderable handle up/down/enter via its own focus
        return false;
    }
  }

  /** Remove the popup from the render tree */
  destroy(): void {
    this.hide();
    this.renderer.root.remove(this.root.id);
  }
}
