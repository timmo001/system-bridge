import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Effect, Fiber, Redacted, Schema, Stream } from "effect";
import { SystemBridgeWebSocket } from "../src/index.js";

const token = "test-token";

const battery = { is_charging: true, percentage: 55, time_remaining: null };

const memory = {
  swap: {
    total: 2,
    used: 1,
    free: 1,
    percent: 50,
    sin: 0,
    sout: 0,
  },
  virtual: {
    total: 4,
    available: 2,
    percent: 50,
    used: 2,
    free: 2,
    active: 1,
    inactive: 1,
    buffers: 0,
    cached: 0,
    wired: 0,
    shared: 0,
  },
};

type Json = Schema.Json;

const BackendRequest = Schema.fromJsonString(
  Schema.Struct({
    token: Schema.String,
    id: Schema.String,
    event: Schema.String,
    data: Schema.Struct({
      modules: Schema.optionalKey(Schema.Array(Schema.String)),
    }),
  }),
);

type BackendRequest = typeof BackendRequest.Type;

interface Reply {
  readonly id: string;
  readonly type: string;
  readonly subtype?: string;
  readonly message?: string;
  readonly module?: string;
  readonly data?: Json;
}

const update = (module: string, data: Json): Reply => ({
  id: "system",
  type: "DATA_UPDATE",
  subtype: "NONE",
  module,
  data,
});

const moduleData = new Map<string, Json>([
  ["battery", battery],
  ["memory", memory],
]);

/** What the fake backend sends back for each request. */
const repliesFor = (request: BackendRequest): ReadonlyArray<Reply> => {
  const { id } = request;

  if (request.token !== token) {
    return [{ id, type: "ERROR", subtype: "BAD_TOKEN", message: "Bad token" }];
  }

  switch (request.event) {
    case "GET_DATA":
      return [
        { id, type: "DATA_GET", subtype: "NONE" },
        { id, type: "NOT_RELATED", subtype: "NONE" },
        ...(request.data.modules ?? []).map((module) =>
          update(module, moduleData.get(module) ?? null),
        ),
      ];
    case "REGISTER_DATA_LISTENER":
      return [
        { id, type: "DATA_LISTENER_REGISTERED", subtype: "NONE" },
        update("battery", null),
        update("battery", { broken: true }),
        update("battery", battery),
      ];
    case "COMMAND_EXECUTE":
      return [
        { id, type: "COMMAND_EXECUTING", subtype: "NONE" },
        {
          id,
          type: "COMMAND_COMPLETED",
          subtype: "NONE",
          data: { commandID: "build", exitCode: 0, stdout: "ok", stderr: "" },
        },
      ];
    case "GET_FILES":
      return [{ id, type: "FILES", subtype: "NONE", data: null }];
    case "MEDIA_CONTROL":
      return [
        {
          id,
          type: "ERROR",
          subtype: "INVALID_ACTION",
          message: "Invalid action",
        },
      ];
    case "VALIDATE_DIRECTORY":
      return [
        {
          id,
          type: "DIRECTORY_VALIDATED",
          subtype: "NONE",
          data: { valid: true },
        },
      ];
    default:
      return [];
  }
};

let server: ReturnType<typeof Bun.serve>;

beforeAll(() => {
  server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: (request, bunServer) =>
      bunServer.upgrade(request, { data: undefined })
        ? undefined
        : new Response("Upgrade required", { status: 426 }),
    websocket: {
      message: (ws, message) => {
        const request = Schema.decodeSync(BackendRequest)(String(message));

        if (request.event === "EXIT_APPLICATION") {
          ws.close();

          return;
        }

        for (const reply of repliesFor(request)) {
          ws.send(JSON.stringify(reply));
        }
      },
    },
  });
});

afterAll(() => server.stop(true));

const run = <A, E>(
  effect: Effect.Effect<A, E, SystemBridgeWebSocket>,
  options: { readonly token?: string } = {},
) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(
        SystemBridgeWebSocket.layerGlobal({
          host: "127.0.0.1",
          port: server.port ?? 0,
          token: Redacted.make(options.token ?? token),
          requestTimeout: "500 millis",
          dataTimeout: "500 millis",
        }),
      ),
    ),
  );

describe("SystemBridgeWebSocket", () => {
  test("collect and decode requested modules", async () => {
    const data = await run(
      SystemBridgeWebSocket.use((ws) => ws.getData(["battery", "memory"])),
    );

    expect(data.battery?.percentage).toBe(55);
    expect(data.memory?.virtual?.total).toBe(4);
  });

  test("report modules that never arrive", async () => {
    const missing = await run(
      SystemBridgeWebSocket.use((ws) => ws.getData(["battery", "cpu"])).pipe(
        Effect.flatMap(() => Effect.fail("expected a DataMissingError")),
        Effect.catchTag("DataMissingError", (error) =>
          Effect.succeed(error.modules),
        ),
      ),
    );

    expect(missing).toEqual(["cpu"]);
  });

  test("stream updates, skipping empty and invalid ones", async () => {
    const update = await run(
      SystemBridgeWebSocket.use((ws) =>
        Effect.gen(function* () {
          const first = yield* ws.updates.pipe(
            Stream.runHead,
            Effect.forkChild,
          );

          yield* Effect.yieldNow;

          yield* ws.registerDataListener(["battery"]);

          return yield* Fiber.join(first);
        }),
      ),
    );

    expect(update._tag).toBe("Some");
  });

  test("wait past interim replies for the command result", async () => {
    const result = await run(
      SystemBridgeWebSocket.use((ws) => ws.executeCommand("build")),
    );

    expect(result.stdout).toBe("ok");
  });

  test("treat a null file list as empty", async () => {
    const files = await run(
      SystemBridgeWebSocket.use((ws) => ws.getFiles({ base: "documents" })),
    );

    expect(files).toEqual([]);
  });

  test("decode a validation result", async () => {
    const valid = await run(
      SystemBridgeWebSocket.use((ws) => ws.validateDirectory("/tmp")),
    );

    expect(valid).toBe(true);
  });

  test.each([
    ["a bad token", "wrong", "AuthenticationError"],
    ["an error reply", token, "BadRequestError"],
  ] as const)("map %s", async (_, used, tag) => {
    const error = await run(
      SystemBridgeWebSocket.use((ws) => ws.mediaControl("PLAY")).pipe(
        Effect.flip,
      ),
      { token: used },
    );

    expect(error._tag).toBe(tag);
  });

  test("time out when no reply comes", async () => {
    const error = await run(
      SystemBridgeWebSocket.use((ws) => ws.getSettings).pipe(Effect.flip),
    );

    expect(error._tag).toBe("RequestTimeoutError");
  });

  test("fail waiting requests when the socket closes", async () => {
    const error = await run(
      SystemBridgeWebSocket.use((ws) =>
        Effect.gen(function* () {
          const waiting = yield* ws.getSettings.pipe(
            Effect.flip,
            Effect.forkChild,
          );

          yield* Effect.yieldNow;

          yield* ws.exitBackend;

          return yield* Fiber.join(waiting);
        }),
      ),
    );

    expect(error._tag).toBe("ConnectionError");
  });
});
