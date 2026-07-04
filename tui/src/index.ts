import { Effect } from "effect";
import { createCliRenderer } from "@opentui/core";
import { loadTheme } from "./theme.js";
import { Toast } from "./tui/Toast.js";
import { App } from "./tui/App.js";
import { createCommandRunner } from "./services/CommandRunner.js";
import { parseFlags, printHelp } from "./flags.js";

const log = (msg: string) => console.error(`[sb-tui] ${msg}`);

// --- Flag parsing (pure, synchronous) ---

const flags = parseFlags(process.argv.slice(2));

if (flags.help) {
  printHelp();
  process.exit(0);
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
      onDestroy: () => process.exit(0),
    }),
  );
  log("Renderer created");

  const toast = new Toast(renderer, theme);
  const commandRunner = createCommandRunner(renderer, toast);

  // Create the app
  const app = new App(
    {
      renderer,
      theme,
      commandRunner,
    },
    {
      initialSubmenuId: flags.submenuId,
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

  return yield* Effect.never;
});

Effect.runPromise(program).catch((err) => {
  log(`Fatal error: ${err}`);
  console.error(err);
  process.exit(1);
});
