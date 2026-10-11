import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Effect, Redacted } from "effect";
import { SystemBridgeHttp } from "../src/index.js";

const token = "test-token";

const battery = { is_charging: false, percentage: 80, time_remaining: 3600 };

let server: ReturnType<typeof Bun.serve>;

beforeAll(() => {
  server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    routes: {
      "/api/health": () =>
        Response.json({
          status: "healthy",
          timestamp: "2026-10-09T12:00:00Z",
          version: "5.11.1",
        }),
      "/api/data/:module": (request) => {
        if (request.headers.get("token") !== token) {
          return Response.json({ error: "Invalid token" }, { status: 401 });
        }

        return responseFor(request.params.module);
      },
    },
  });
});

afterAll(() => server.stop(true));

const responseFor = (module: string): Response => {
  switch (module) {
    case "media":
      return Response.json(null);
    case "cpu":
      return Response.json({ error: "Module failed" }, { status: 500 });
    case "gpus":
      return Response.json({ error: "Bad module" }, { status: 400 });
    case "memory":
      return Response.json({ unexpected: true });
    default:
      return Response.json(battery);
  }
};

const run = <A, E>(
  effect: Effect.Effect<A, E, SystemBridgeHttp>,
  options: { readonly token?: string } = {},
) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(
        SystemBridgeHttp.layerFetch({
          host: "127.0.0.1",
          port: server.port ?? 0,
          token: Redacted.make(options.token ?? token),
        }),
      ),
    ),
  );

describe("SystemBridgeHttp", () => {
  test("read health without a token", async () => {
    const health = await run(
      SystemBridgeHttp.use((http) => http.health),
      { token: "wrong" },
    );

    expect(health.version).toBe("5.11.1");
  });

  test("decode module data", async () => {
    const data = await run(
      SystemBridgeHttp.use((http) => http.getModuleData("battery")),
    );

    expect(data.percentage).toBe(80);
  });

  test.each([
    ["battery", "wrong", "AuthenticationError"],
    ["media", token, "DataMissingError"],
    ["gpus", token, "BadRequestError"],
    ["cpu", token, "ConnectionError"],
    ["memory", token, "DecodeError"],
  ] as const)("map %s with token %s to %s", async (module, used, tag) => {
    const error = await run(
      SystemBridgeHttp.use((http) => http.getModuleData(module)).pipe(
        Effect.flip,
      ),
      { token: used },
    );

    expect(error._tag).toBe(tag);
  });

  test("keep the backend's error message", async () => {
    const error = await run(
      SystemBridgeHttp.use((http) => http.getModuleData("battery")).pipe(
        Effect.flip,
      ),
      { token: "wrong" },
    );

    expect(error.message).toBe("Invalid token");
  });
});
