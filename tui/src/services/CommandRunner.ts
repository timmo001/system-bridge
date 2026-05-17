import { Effect } from "effect";
import type { CliRenderer } from "@opentui/core";
import type { NotifyConfig } from "../types.js";
import type { Toast } from "../tui/Toast.js";
import { CommandRunnerError } from "./CommandRunnerError.js";

const log = (msg: string) => console.error(`[sb-tui:CommandRunner] ${msg}`);

/** Service for executing shell commands with TUI suspend/resume lifecycle */
export interface CommandRunnerService {
  /** Suspend the TUI, run the command with inherited stdio, then resume.
   *  When wait is true, shows "Press any key to continue" before resuming. */
  readonly runSuspended: (
    cmd: string,
    wait: boolean,
  ) => Effect.Effect<void, CommandRunnerError>;

  /** Run a command in the background without suspending the TUI.
   *  Returns immediately; stdout/stderr are captured silently. */
  readonly runSilent: (cmd: string) => Effect.Effect<void, CommandRunnerError>;

  /** Run a command silently with toast notifications for progress and result. */
  readonly runNotify: (
    cmd: string,
    notify: NotifyConfig,
  ) => Effect.Effect<void, CommandRunnerError>;
}

/** Create a CommandRunner bound to the given renderer and toast */
export function createCommandRunner(
  renderer: CliRenderer,
  toast: Toast,
): CommandRunnerService {
  return {
    runSuspended: Effect.fn("CommandRunner.runSuspended")(function* (
      cmd: string,
      wait: boolean,
    ) {
      log(`Suspending for: ${cmd}`);
      yield* Effect.sync(() => {
        renderer.suspend();
        renderer.currentRenderBuffer.clear();

        const cols = process.stdout.columns || 80;
        const label = ` ${cmd} `;
        const pad = Math.max(0, cols - label.length);
        const left = Math.floor(pad / 2);
        const right = pad - left;
        const header =
          "\x1b[90m" +
          "─".repeat(left) +
          "\x1b[0m\x1b[1m" +
          label +
          "\x1b[0m\x1b[90m" +
          "─".repeat(right) +
          "\x1b[0m";
        process.stdout.write(`\n\n${header}\n\n`);
      });

      yield* Effect.tryPromise({
        try: () => {
          const proc = Bun.spawn(["bash", "-c", cmd], {
            stdin: "inherit",
            stdout: "inherit",
            stderr: "inherit",
          });
          return proc.exited;
        },
        catch: (err) =>
          new CommandRunnerError({ message: `Spawn failed: ${err}` }),
      });

      if (wait) {
        yield* Effect.promise(
          () =>
            new Promise<void>((resolve) => {
              process.stdout.write(
                "\n\x1b[90mPress any key to continue...\x1b[0m",
              );
              const wasRaw = process.stdin.isRaw;
              if (process.stdin.isTTY) process.stdin.setRawMode(true);
              process.stdin.resume();
              process.stdin.once("data", () => {
                if (process.stdin.isTTY) process.stdin.setRawMode(wasRaw);
                process.stdin.pause();
                resolve();
              });
            }),
        );
      }

      yield* Effect.sync(() => {
        renderer.currentRenderBuffer.clear();
        renderer.resume();
        renderer.requestRender();
        log("Resumed after command");
      });
    }),

    runSilent: Effect.fn("CommandRunner.runSilent")(function* (cmd: string) {
      log(`Running silently: ${cmd}`);

      const exitCode = yield* Effect.tryPromise({
        try: () => {
          const proc = Bun.spawn(["bash", "-c", cmd], {
            stdout: "pipe",
            stderr: "pipe",
          });
          return proc.exited;
        },
        catch: (err) =>
          new CommandRunnerError({ message: `Spawn failed: ${err}` }),
      });

      if (exitCode !== 0) {
        log(`Silent command failed (exit ${exitCode}): ${cmd}`);
      } else {
        log(`Silent command completed: ${cmd}`);
      }
    }),

    runNotify: Effect.fn("CommandRunner.runNotify")(function* (
      cmd: string,
      notify: NotifyConfig,
    ) {
      log(`Running with notification: ${cmd}`);
      yield* Effect.sync(() => toast.show(notify.id, notify.progress, "info"));

      const exitCode = yield* Effect.tryPromise({
        try: async () => {
          const proc = Bun.spawn(["bash", "-c", cmd], {
            stdout: "pipe",
            stderr: "pipe",
          });
          const code = await proc.exited;

          if (code !== 0) {
            const stderr = await new Response(proc.stderr).text();
            return { code, stderr: stderr.trim() };
          }
          return { code, stderr: "" };
        },
        catch: (err) =>
          new CommandRunnerError({ message: `Spawn failed: ${err}` }),
      });

      if (exitCode.code !== 0) {
        const errMsg = exitCode.stderr.split("\n")[0] || "Command failed";
        log(
          `Notify command failed (exit ${exitCode.code}): ${exitCode.stderr}`,
        );
        yield* Effect.sync(() => toast.show(notify.id, errMsg, "error"));
      } else {
        log(`Notify command completed: ${cmd}`);
        yield* Effect.sync(() =>
          toast.show(notify.id, notify.success, "success"),
        );
      }
    }),
  };
}
