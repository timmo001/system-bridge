import { submenus } from "./menu.js";

/** Parsed CLI flags for `system-bridge-tui` */
export interface Flags {
  /** Submenu to open on startup, if a known submenu path was passed */
  readonly submenuId: string | undefined;
  /** Show help and exit */
  readonly help: boolean;
}

/**
 * Parse CLI args into structured flags.
 *
 * Leading positional args are joined with `.` and matched against the submenu
 * registry. An exact submenu path (for example `client` or `client data`) opens
 * that submenu; anything else leaves `submenuId` undefined so the main menu
 * opens. Subcommand paths no longer run commands.
 */
export function parseFlags(args: readonly string[]): Flags {
  const positionals: string[] = [];
  let help = false;

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      help = true;
    } else if (!arg.startsWith("-")) {
      positionals.push(arg);
    }
  }

  const path = positionals.join(".");
  const submenuId = submenus.has(path) ? path : undefined;

  return { submenuId, help };
}

/** Print help text */
export function printHelp(): void {
  console.log(`Usage: system-bridge-tui [submenu] [options]

Launch the System Bridge TUI. Without arguments, opens the main menu.
Passing a submenu path opens that submenu directly:

  system-bridge-tui client        Open the client menu
  system-bridge-tui client data   Open the data menu

Options:
  --help, -h  Show this help message`);
}
