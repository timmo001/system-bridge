import type { ViewId } from "./types.js";
import { menuItemsById, submenus } from "./menu.js";

/** Parsed CLI flags for `system-bridge-tui` */
export interface Flags {
  /** Resolved subcommand (dot-separated path) matching a menu item ID or submenu */
  readonly subcommand: string | undefined;
  /** Show help and exit */
  readonly help: boolean;
  /** Remaining args not consumed by subcommand or flag parsing */
  readonly rest: readonly string[];
}

/** Check whether a candidate string matches any known view, menu item, or submenu */
function isKnownTarget(candidate: string): boolean {
  if (candidate === "client") return true;
  if (menuItemsById.has(candidate) || submenus.has(candidate)) return true;
  return false;
}

/**
 * Parse CLI args into structured flags with greedy subcommand resolution.
 *
 * Positional args are joined with `.` using greedy longest-match against
 * the menu registry. For example, `["client", "data", "list"]` resolves
 * to subcommand `"client.data.list"` if that ID exists.
 */
export function parseFlags(args: readonly string[]): Flags {
  let subcommand: string | undefined;
  let help = false;
  const rest: string[] = [];

  let i = 0;

  // Collect all leading positional args (before any flags)
  const positionals: string[] = [];
  while (i < args.length && !args[i].startsWith("-")) {
    positionals.push(args[i]);
    i++;
  }

  // Greedy longest-match resolution for subcommand path
  if (positionals.length > 0) {
    let consumed = 0;
    for (let len = positionals.length; len >= 1; len--) {
      const candidate = positionals.slice(0, len).join(".");
      if (isKnownTarget(candidate)) {
        subcommand = candidate;
        consumed = len;
        break;
      }
    }
    if (consumed === 0) {
      subcommand = positionals[0];
      consumed = 1;
    }
    for (let j = consumed; j < positionals.length; j++) {
      rest.push(positionals[j]);
    }
  }

  // Parse remaining flags
  for (; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      help = true;
    } else {
      rest.push(arg);
    }
  }

  return { subcommand, help, rest };
}

/** Resolve a subcommand string to a navigation target */
export function resolveSubcommand(
  sub: string,
):
  | { type: "view"; viewId: ViewId }
  | { type: "item"; itemId: string }
  | undefined {
  // Direct view mappings
  if (sub === "client") return { type: "view", viewId: "submenu" };

  // Match against menu item IDs or submenu keys
  if (menuItemsById.has(sub)) return { type: "item", itemId: sub };
  if (submenus.has(sub)) return { type: "item", itemId: sub };

  return undefined;
}

/** Print help text */
export function printHelp(subcommand?: string): void {
  if (subcommand === "client") {
    console.log(`Usage: system-bridge-tui client [subcommand...]

Open the client commands menu. Subcommands can be specified
as space-separated paths:

  system-bridge-tui client token         Print API token
  system-bridge-tui client data list     List data modules
  system-bridge-tui client data run      Run a data module

Available subcommands:
  token          Print the API token
  notification   Send a notification
  discovery      Service discovery
  data           Data modules

Options:
  --help, -h  Show this help message`);
    return;
  }

  console.log(`Usage: system-bridge-tui [subcommand] [options]

Launch the System Bridge TUI. Without a subcommand, opens the main menu.

Subcommands:
  backend                    Start the backend server
  client [subcommand..]      Client commands (space-separated paths)
  version                    Show application version

Options:
  --help, -h  Show this help message

Examples:
  system-bridge-tui                         Main menu
  system-bridge-tui client                  Client submenu
  system-bridge-tui client data list        List data modules
  system-bridge-tui client notification     Notification form`);
}
