import {
  type CliRenderer,
  BoxRenderable,
  TextRenderable,
  t,
  bold,
  fg,
} from "@opentui/core";
import type { ToastVariant } from "../types.js";
import type { Theme } from "../theme.js";

/** Auto-dismiss delay per variant (milliseconds) */
const DISMISS_MS: Record<ToastVariant, number> = {
  info: 5000,
  success: 3000,
  error: 8000,
};

/** Icon per variant */
const ICON: Record<ToastVariant, string> = {
  info: "󰋼",
  success: "󰄬",
  error: "󰅚",
};

/**
 * Single-slot toast notification overlay.
 *
 * Positioned absolutely in the top-right corner of the terminal.
 * Supports ID-based replacement: calling {@link show} with the same `id`
 * replaces the current toast in-place instead of stacking.
 */
export class Toast {
  private root: BoxRenderable;
  private text: TextRenderable;
  private theme: Theme;
  private currentId: string | null = null;
  private timeout: ReturnType<typeof setTimeout> | null = null;

  constructor(renderer: CliRenderer, theme: Theme) {
    this.theme = theme;

    this.root = new BoxRenderable(renderer, {
      id: "toast-root",
      position: "absolute",
      top: 1,
      right: 2,
      width: 50,
      height: 3,
      borderStyle: "rounded",
      borderColor: theme.accent,
      backgroundColor: theme.bgElevated,
      paddingLeft: 1,
      paddingRight: 1,
      alignItems: "center",
      zIndex: 200,
      visible: false,
    });

    this.text = new TextRenderable(renderer, {
      id: "toast-text",
      content: "",
    });
    this.root.add(this.text);

    renderer.root.add(this.root);
  }

  /** Resolve the border colour for a toast variant */
  private borderColor(variant: ToastVariant): string {
    switch (variant) {
      case "info":
        return this.theme.accent;
      case "success":
        return this.theme.green;
      case "error":
        return this.theme.red;
    }
  }

  /**
   * Show a toast notification.
   *
   * If `id` matches the current toast, the message and variant are replaced
   * in-place. Otherwise the previous toast is dismissed and a new one shown.
   *
   * @param id - Stable grouping identifier (e.g. "memory", "restart.waybar")
   * @param message - Display text
   * @param variant - Controls border colour and auto-dismiss timing
   */
  show(id: string, message: string, variant: ToastVariant): void {
    // Clear any pending dismiss timer
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    const color = this.borderColor(variant);
    this.currentId = id;
    this.root.borderColor = color;
    this.text.content = t`${fg(color)(ICON[variant])}  ${bold(fg(this.theme.fg)(message))}`;
    this.root.visible = true;

    this.timeout = setTimeout(() => {
      this.dismiss();
    }, DISMISS_MS[variant]);
  }

  /** Hide the current toast and clear state */
  dismiss(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    this.currentId = null;
    this.root.visible = false;
  }

  /** Remove the toast from the render tree */
  destroy(): void {
    this.dismiss();
  }
}
