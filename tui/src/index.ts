import { Effect } from "effect";
import { createCliRenderer } from "@opentui/core";
import { loadTheme } from "./theme.js";
import { Toast } from "./tui/Toast.js";
import { App } from "./tui/App.js";
import { CommandRunner, CommandRunnerLive } from "./services/CommandRunner.js";
import { parseFlags, resolveSubcommand, printHelp } from "./flags.js";
import { menuItemsById } from "./menu.js";
import type { ViewId } from "./types.js";

const log = (msg: string) => console.error(`[sb-tui] ${msg}`);

// --- Flag parsing (pure, synchronous) ---

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

// --- Effect program ---

const program = Effect.gen(function* () {
  log("Starting...");

  const theme = yield* loadTheme;

  log("Creating renderer...");
  const renderer = yield* Effect.promise(() =>
    createCliRenderer({
      exitOnCtrlC: true,
      screenMode: "alternate-screen",
      useMouse: false,
      backgroundColor: theme.bg,
    }),
  );
  log("Renderer created");

  const toast = new Toast(renderer, theme);
  const commandRunner = yield* Effect.provide(
    CommandRunner,
    CommandRunnerLive(renderer, toast),
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
  yield* Effect.sync(() =>
    process.stdout.write("\x1b]0;System Bridge TUI\x07"),
  );

  log("Starting renderer...");
  renderer.start();
  log("Renderer started — TUI is live");

  yield* Effect.never;
});

Effect.runPromise(program).catch((err) => {
  log(`Fatal error: ${err}`);
  console.error(err);
  process.exit(1);
});
