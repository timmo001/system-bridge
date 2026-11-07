/**
 * The System Bridge OpenCode plugin: this machine through the System Bridge
 * backend as the `system-bridge` Code Mode namespace. It reads the tools from
 * `system-bridge agent tools --json`, which lists the backend's MCP tools, and
 * runs each with `system-bridge agent call`, so they always match the binary
 * on the PATH. Copied from ha-bridge's plugin, itself modelled on upkeep's.
 */
import { Plugin } from "@opencode/plugin/effect";
import { Tool } from "@opencode/schema/tool";
import { Effect, Result, Schema } from "effect";
import { strictInput } from "./input";
import { loadManifest, type ManifestTool, runSystemBridge } from "./systemBridge";

const namespace = "system-bridge";

const decodeJson = Schema.decodeUnknownEffect(
  Schema.fromJsonString(Schema.Unknown),
);

/** Tool input as JSON; each tool's own schema has already checked it. */
const Input = Schema.Record(Schema.String, Schema.Json);

const decodeInput = Schema.decodeUnknownEffect(Input);

const isNonEmptyString = Schema.is(Schema.NonEmptyString);

/**
 * What the permission covers: the tool, narrowed by its resource input when
 * it names one, so "always allow" on media_control covers one action.
 */
const permissionTarget = (tool: ManifestTool, input: typeof Input.Type) => {
  const value = tool.resource === undefined ? undefined : input[tool.resource];

  return isNonEmptyString(value) ? `${tool.name} ${value}` : tool.name;
};

export default Plugin.define({
  id: "system-bridge",
  effect: (context) =>
    Effect.gen(function* () {
      if (Bun.which("system-bridge") === null) return;

      const manifest = yield* loadManifest.pipe(Effect.result);

      if (Result.isFailure(manifest)) {
        return yield* Effect.logWarning(
          `system-bridge: no Code Mode tools: ${manifest.failure.message}`,
        );
      }

      // No token means System Bridge has never run here, so leave the
      // namespace out.
      if (!manifest.success.available) return;

      const sessionDirectory = (call: Tool.Context) =>
        context.session.get({ sessionID: call.sessionID }).pipe(
          Effect.map((session) => session.location.directory),
          Effect.mapError(
            (error) =>
              new Tool.Error({
                message: "Could not read the session's directory",
                error,
              }),
          ),
        );

      // OpenCode's prompt only shows the action for plugin permissions, so
      // the action names the tool and what it acts on; rules match it with
      // `system-bridge.write *`.
      const assertWrite = (
        tool: ManifestTool,
        call: Tool.Context,
        input: typeof Input.Type,
        stdin: string,
      ) => {
        if (tool.access !== "write") return Effect.void;

        const target = permissionTarget(tool, input);
        const resource = `${namespace}_${target}`;

        return context.permission.assert({
          sessionID: call.sessionID,
          agent: call.agent,
          action: `${namespace}.write ${target}`,
          resources: [resource],
          // An empty save list keeps "always" from being stored, so the next call asks again.
          save: tool.alwaysAsk ? [] : [resource],
          metadata: {
            command: `system-bridge ${tool.argv.join(" ")} ${stdin}`,
          },
          source: { type: "tool", messageID: call.messageID, id: call.id },
        });
      };

      const execute =
        (tool: ManifestTool) =>
        (input: typeof Input.Type, call: Tool.Context) =>
          Effect.gen(function* () {
            const stdin = JSON.stringify(input);

            yield* assertWrite(tool, call, input, stdin);

            const stdout = yield* runSystemBridge(tool.argv, {
              cwd: yield* sessionDirectory(call),
              stdin: tool.stdin ? stdin : undefined,
              timeout: tool.timeoutMillis,
              env: { OPENCODE_SESSION_ID: call.sessionID },
            });

            if (!tool.json) return { output: stdout.trimEnd() };

            return {
              output: yield* decodeJson(stdout).pipe(
                Effect.mapError(
                  (error) =>
                    new Tool.Error({
                      message: `system-bridge ${tool.name} did not print JSON: ${error.message}`,
                    }),
                ),
              ),
            };
          });

      yield* context.tool.transform((draft) => {
        draft.namespace({
          name: namespace,
          description:
            "This machine through System Bridge: read system modules (cpu, memory, disks, processes, sensors, media, audio, displays and the desktop with its Hyprland windows, workspaces, binds, options and config errors), metric history, media files and the clipboard, and control windows, workspaces, Hyprland, media, audio, displays, Bluetooth, cameras, Discord, the keyboard, notifications, the clipboard, power and Omarchy menus.",
        });

        for (const tool of manifest.success.tools) {
          const run = execute(tool);

          draft.add({
            name: tool.name,
            description: tool.description,
            input: strictInput(tool.input),
            output: tool.json ? Schema.Unknown : Schema.String,
            options:
              tool.access === "write"
                ? {
                    namespace,
                    codemode: true,
                    pinned: tool.pinned,
                    permission: `${namespace}.write`,
                  }
                : { namespace, codemode: true, pinned: tool.pinned },
            execute: (input, call) =>
              decodeInput(input).pipe(
                Effect.mapError(
                  (error) =>
                    new Tool.Error({
                      message: `Invalid input: ${error.message}`,
                    }),
                ),
                Effect.flatMap((decoded) => run(decoded, call)),
              ),
          });
        }
      });
    }),
});
