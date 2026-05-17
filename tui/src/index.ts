import { createCliRenderer } from "@opentui/core";
import { theme } from "./theme.js";
import { Toast } from "./tui/Toast.js";
import { App } from "./tui/App.js";
import { createCommandRunner } from "./services/CommandRunner.js";
import { parseFlags, resolveSubcommand, printHelp } from "./flags.js";
import { menuItemsById } from "./menu.js";
import type { ViewId } from "./types.js";

const log = (msg: string) => console.error(`[sb-tui] ${msg}`);

const flags = parseFlags(process.argv.slice(2));

if (flags.help) {
  printHelp(flags.subcommand);
  process.exit(0);
}

// Resolve subcommand to determine startup behaviour
let initialView: ViewId = "main";
let executeItemId: string | undefined;

if (flags.subcommand) {
  const resolved = resolveSubcommand(flags.subcommand);
  if (!resolved) {
    console.error(`Unknown subcommand: ${flags.subcommand}`);
    printHelp();
    process.exit(1);
  }

  if (resolved.type === "view") {
    initialView = resolved.viewId;
  } else {
    const item = menuItemsById.get(resolved.itemId);
    if (item) {
      const { action } = item;
      if (
        action.type === "command" ||
        action.type === "silent" ||
        action.type === "notify" ||
        action.type === "submenu"
      ) {
        executeItemId = resolved.itemId;
      } else if (action.type === "view") {
        initialView = action.viewId;
      }
    }
  }
}

async function main() {
  log("Starting...");

  log("Creating renderer...");
  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
    screenMode: "alternate-screen",
    useMouse: false,
    backgroundColor: theme.bg,
  });
  log("Renderer created");

  const commandRunner = createCommandRunner(
    renderer,
    new Toast(renderer, theme),
  );

  // Create the app
  const app = new App(
    {
      renderer,
      theme,
      commandRunner,
    },
    {
      initialView,
      executeItemId,
    },
  );
  log("App created");

  // Set terminal tab title
  process.stdout.write("\x1b]0;System Bridge TUI\x07");

  log("Starting renderer...");
  renderer.start();
  log("Renderer started — TUI is live");
}

main().catch((err) => {
  log(`Fatal error: ${err}`);
  console.error(err);
  process.exit(1);
});
