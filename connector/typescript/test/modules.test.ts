import { describe, expect, test } from "bun:test";
import { Effect, Schema } from "effect";
import { ModuleDataSchemas, ModuleName } from "../src/index.js";
import battery from "./fixtures/battery.json" with { type: "json" };
import cpu from "./fixtures/cpu.json" with { type: "json" };
import discord from "./fixtures/discord.json" with { type: "json" };
import disks from "./fixtures/disks.json" with { type: "json" };
import displays from "./fixtures/displays.json" with { type: "json" };
import gpus from "./fixtures/gpus.json" with { type: "json" };
import media from "./fixtures/media.json" with { type: "json" };
import memory from "./fixtures/memory.json" with { type: "json" };
import networks from "./fixtures/networks.json" with { type: "json" };
import processes from "./fixtures/processes.json" with { type: "json" };
import sensors from "./fixtures/sensors.json" with { type: "json" };
import system from "./fixtures/system.json" with { type: "json" };

const fixtures = {
  battery,
  cpu,
  discord,
  disks,
  displays,
  gpus,
  media,
  memory,
  networks,
  processes,
  sensors,
  system,
};

describe("generated module schemas", () => {
  test.each([...ModuleName.literals])(
    "decode captured %s data",
    async (module) => {
      const decoded = await Effect.runPromise(
        Schema.decodeEffect(ModuleDataSchemas[module])(fixtures[module]),
      );

      expect(decoded).toBeDefined();
    },
  );

  test("reject data with a missing field", async () => {
    const exit = await Effect.runPromiseExit(
      Schema.decodeEffect(ModuleDataSchemas.battery)({
        is_charging: true,
      }),
    );

    expect(exit._tag).toBe("Failure");
  });
});
