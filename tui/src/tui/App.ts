import { Effect } from "effect";
import type { CliRenderer } from "@opentui/core";
import type {
  ViewId,
  MenuItem,
  MenuAction,
  FlagPopupAction,
} from "../types.js";
import type { Theme } from "../theme.js";
import { menuItemsById, submenus } from "../menu.js";
import type { CommandRunnerService } from "../services/CommandRunner.js";
import { MainMenu } from "./MainMenu.js";
import { SubMenu } from "./SubMenu.js";
import { VariantPopup } from "./VariantPopup.js";
import { FlagPopup } from "./FlagPopup.js";

const log = (msg: string) => console.error(`[sb-tui:App] ${msg}`);

export interface AppOptions {
  /** Which view to start on (default: "main") */
  readonly initialView?: ViewId;
  /** If set, execute this menu item immediately on startup and pre-select it */
  readonly executeItemId?: string;
}

/** Dependencies injected into the App at construction time */
export interface AppDeps {
  /** The OpenTUI CLI renderer instance */
  readonly renderer: CliRenderer;
  /** Active colour theme */
  readonly theme: Theme;
  /** Service for running shell commands with suspend/resume */
  readonly commandRunner: CommandRunnerService;
}

/** Top-level TUI application shell managing a view stack and global keyboard */
export class App {
  private renderer: CliRenderer;
  private commandRunner: CommandRunnerService;
  private mainMenu: MainMenu;
  private clientMenu: SubMenu;
  private variantPopup: VariantPopup;
  private flagPopup: FlagPopup;
  private activeView: ViewId = "main";
  private viewStack: ViewId[] = [];

  constructor(deps: AppDeps, options: AppOptions = {}) {
    this.renderer = deps.renderer;
    this.commandRunner = deps.commandRunner;

    // --- Create views ---

    this.mainMenu = new MainMenu(deps.renderer, deps.theme, {
      onSelect: (item) => this.handleMenuAction(item),
      initialSelectedId: options.executeItemId,
    });

    this.clientMenu = new SubMenu(deps.renderer, deps.theme, "client", {
      onAction: (item) => this.handleMenuAction(item),
      onBack: () => this.popView(),
    });

    this.variantPopup = new VariantPopup(deps.renderer, deps.theme, {
      onSelect: (action) => {
        queueMicrotask(() => this.focusActiveView());
        this.dispatchAction(action);
      },
      onDismiss: () => {
        queueMicrotask(() => this.focusActiveView());
      },
    });

    this.flagPopup = new FlagPopup(deps.renderer, deps.theme, {
      onSubmit: (action) => {
        queueMicrotask(() => this.focusActiveView());
        this.dispatchAction(action);
      },
      onDismiss: () => {
        queueMicrotask(() => this.focusActiveView());
      },
    });

    // --- Hide all views initially ---
    this.mainMenu.setVisible(false);
    this.clientMenu.setVisible(false);

    // --- Global keyboard ---
    // Ctrl+C is handled by OpenTUI's exitOnCtrlC option which ensures
    // terminal state is fully restored before exiting.
    deps.renderer.keyInput.on("keypress", (key) => {
      // Route keys to popups when visible
      if (this.flagPopup.visible) {
        this.flagPopup.handleKeyPress(key);
        return;
      }
      if (this.variantPopup.visible) {
        this.variantPopup.handleKeyPress(key);
        return;
      }
    });

    // --- Determine initial view ---
    const startView = options.initialView ?? "main";

    if (startView !== "main") {
      this.viewStack.push("main");
    }

    // Handle immediate item execution (subcommand mode)
    if (options.executeItemId) {
      const item = menuItemsById.get(options.executeItemId);
      if (item) {
        this.showView("main");
        const { action } = item;
        if (
          action.type === "command" ||
          action.type === "silent" ||
          action.type === "notify"
        ) {
          setTimeout(() => {
            Effect.runPromise(this.commandRunner.runSuspended(action.cmd, true))
              .then(() => deps.renderer.destroy())
              .catch((err) => {
                log(`Execute error: ${err}`);
                deps.renderer.destroy();
              });
          }, 50);
        } else {
          setTimeout(() => this.handleMenuAction(item), 50);
        }
        return;
      }
    }

    this.showView(startView);
  }

  /** Navigate to a view, pushing the current one onto the stack */
  pushView(viewId: ViewId): void {
    if (this.activeView !== viewId) {
      this.viewStack.push(this.activeView);
    }
    this.showView(viewId);
  }

  /** Return to the previous view on the stack */
  popView(): void {
    const prev = this.viewStack.pop();
    if (prev) {
      this.showView(prev);
    }
  }

  private showView(viewId: ViewId): void {
    log(`Switching to view: ${viewId}`);

    // Hide all
    this.mainMenu.setVisible(false);
    this.clientMenu.setVisible(false);

    this.activeView = viewId;

    switch (viewId) {
      case "main":
        this.mainMenu.setVisible(true);
        this.mainMenu.resetAndFocus();
        break;
      case "submenu":
        this.clientMenu.setVisible(true);
        this.clientMenu.resetAndFocus();
        break;
    }
  }

  private handleMenuAction(item: MenuItem): void {
    // If the item has variants, open the variant popup
    if (item.variants && item.variants.length > 0) {
      log(`Opening variant popup for item ${item.id}`);
      this.blurActiveView();
      this.variantPopup.show(item);
      return;
    }

    this.dispatchAction(item.action);
  }

  /** Dispatch a menu action */
  private dispatchAction(action: MenuAction): void {
    log(`Dispatching action: ${action.type}`);

    switch (action.type) {
      case "command":
        Effect.runPromise(
          this.commandRunner.runSuspended(action.cmd, action.wait).pipe(
            Effect.catch(() => {
              log(`Command error`);
              return Effect.void;
            }),
          ),
        );
        break;

      case "silent":
        Effect.runPromise(
          this.commandRunner.runSilent(action.cmd).pipe(
            Effect.catch(() => {
              log(`Silent command error`);
              return Effect.void;
            }),
          ),
        );
        break;

      case "notify":
        Effect.runPromise(
          this.commandRunner.runNotify(action.cmd, action.notify).pipe(
            Effect.catch(() => {
              log(`Notify command error`);
              return Effect.void;
            }),
          ),
        );
        break;

      case "view":
        this.pushView(action.viewId);
        break;

      case "submenu":
        this.handleSubmenuAction(action.menuId);
        break;

      case "flagPopup":
        this.handleFlagPopupAction(action);
        break;

      case "quit":
        this.renderer.destroy();
        break;

      case "exec":
        this.renderer.suspend();
        log(`Exec: ${action.cmd}`);
        {
          const proc = Bun.spawn(["bash", "-c", action.cmd], {
            stdin: "inherit",
            stdout: "inherit",
            stderr: "inherit",
          });
          proc.exited.then((code) => process.exit(code));
        }
        break;
    }
  }

  private handleSubmenuAction(menuId: string): void {
    // Navigate to the client submenu view
    // The SubMenu component handles nested submenus internally
    if (menuId === "client") {
      this.clientMenu.resetToRoot();
      this.pushView("submenu");
    } else if (menuId.startsWith("client.")) {
      // Push into a nested submenu within the client view
      this.clientMenu.pushSubmenu(menuId);
      if (this.activeView !== "submenu") {
        this.pushView("submenu");
      }
    }
  }

  private async handleFlagPopupAction(action: FlagPopupAction): Promise<void> {
    this.blurActiveView();

    // For data run: dynamically fetch available modules
    if (action.baseCmd.includes("client data run")) {
      this.flagPopup.show(action);
      try {
        const proc = Bun.spawn(
          ["bash", "-c", "system-bridge client data list --json"],
          { stdout: "pipe", stderr: "pipe" },
        );
        const output = await new Response(proc.stdout).text();
        await proc.exited;
        const modules: string[] = JSON.parse(output.trim());
        this.flagPopup.updateSelectOptions("module", [...modules, "ALL"]);
      } catch (err) {
        log(`Failed to fetch modules: ${err}`);
        // Fall back to just "All"
        this.flagPopup.updateSelectOptions("module", ["ALL"]);
      }
    } else {
      this.flagPopup.show(action);
    }
  }

  /** Restore keyboard focus to the currently active view */
  private focusActiveView(): void {
    switch (this.activeView) {
      case "main":
        this.mainMenu.focus();
        break;
      case "submenu":
        this.clientMenu.focus();
        break;
    }
  }

  /** Remove keyboard focus from the currently active view */
  private blurActiveView(): void {
    switch (this.activeView) {
      case "main":
        this.mainMenu.blur();
        break;
      case "submenu":
        this.clientMenu.blur();
        break;
    }
  }
}
