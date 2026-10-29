import { expect, test } from "bun:test";
import { groupEntities } from "../src/registry";
import type { DeviceRegistryEntry, EntityRegistryEntry } from "../src/types";

const UUID = "00000000-0000-4000-8000-000000000000";

const device: DeviceRegistryEntry = {
  id: "device",
  name: "example-host",
  name_by_user: null,
  identifiers: [["system_bridge", UUID]],
  configuration_url: "http://example-host:9170/settings",
};

// Keys and translation keys as Core's system_bridge integration writes them
const ENTRIES: [
  entityId: string,
  key: string,
  translationKey: string,
  originalName: string,
][] = [
  ["sensor.host_load", "processes_load", "load", "Load"],
  ["sensor.host_space_used", "filesystem_/", "space_used", "/ space used"],
  [
    "sensor.host_dm_0_read_rate",
    "disk_dm-0_read_rate",
    "disk_device_read_rate",
    "dm-0 read rate",
  ],
  [
    "sensor.host_eno1_download_rate",
    "network_eno1_download_rate",
    "network_interface_download_rate",
    "eno1 download rate",
  ],
  [
    "sensor.host_display_edp_1_refresh_rate",
    "display_eDP-1_refresh_rate",
    "display_refresh_rate",
    "Display eDP-1 refresh rate",
  ],
  [
    "number.host_display_edp_1_brightness",
    "display_eDP-1_brightness",
    "display_brightness",
    "Display eDP-1 brightness",
  ],
  [
    "sensor.host_arc_usage",
    "gpu_card0_usage_percentage",
    "gpu_usage_percentage",
    "Intel Corporation Panther Lake [Arc B390] usage %",
  ],
  [
    "sensor.host_arc_memory_used",
    "gpu_card0_memory_used_percentage",
    "gpu_memory_used_percentage",
    "Intel Corporation Panther Lake [Arc B390] memory used %",
  ],
  [
    "sensor.host_load_cpu_12",
    "processes_load_cpu_12",
    "processes_load_cpu",
    "Load CPU 12",
  ],
];

const entries: EntityRegistryEntry[] = ENTRIES.map(
  ([entity_id, key, translation_key, original_name]) => ({
    entity_id,
    device_id: device.id,
    platform: "system_bridge",
    unique_id: `${UUID}_${key}`,
    translation_key,
    original_name,
    hidden_by: null,
  }),
);

const states = Object.fromEntries(
  ENTRIES.map(([entityId]) => [entityId, { entity_id: entityId, state: "1" }]),
);

test("groups entities by the keys in Core's unique IDs", () => {
  const { single, items } = groupEntities(
    { config: { version: "2026.11.0.dev0" }, states },
    device,
    entries,
  );

  expect(single.get("processes_load")).toBe("sensor.host_load");
  expect(items.mount.get("/")?.fields.get("space_used")).toBe(
    "sensor.host_space_used",
  );
  expect(items.disk.get("dm-0")?.fields.get("read_rate")).toBe(
    "sensor.host_dm_0_read_rate",
  );
  expect(items.interface.get("eno1")?.fields.get("download_rate")).toBe(
    "sensor.host_eno1_download_rate",
  );
  expect(items.display.get("eDP-1")?.fields.get("refresh_rate")).toBe(
    "sensor.host_display_edp_1_refresh_rate",
  );
  expect(items.gpu.get("card0")?.name).toBe(
    "Intel Corporation Panther Lake [Arc B390]",
  );
  expect(items.core.get("12")?.fields.get("processes_load_cpu")).toBe(
    "sensor.host_load_cpu_12",
  );
});

test("leaves out entities from a newer Core release", () => {
  const { items } = groupEntities(
    { config: { version: "2026.10.4" }, states },
    device,
    entries,
  );

  expect(items.disk.size).toBe(0);
  expect(items.interface.size).toBe(0);
  expect(items.mount.size).toBe(1);
});

test("gates an entity with no translation key by its unique ID key", () => {
  const restart: EntityRegistryEntry = {
    entity_id: "button.host_restart",
    device_id: device.id,
    platform: "system_bridge",
    unique_id: `${UUID}_power_restart`,
    translation_key: null,
    original_name: "Restart",
    hidden_by: null,
  };

  const restartButton = (version: string) =>
    groupEntities(
      {
        config: { version },
        states: {
          [restart.entity_id]: {
            entity_id: restart.entity_id,
            state: "unknown",
          },
        },
      },
      device,
      [restart],
    ).single.get("power_restart");

  expect(restartButton("2026.11.0")).toBeUndefined();
  expect(restartButton("2026.12.0b0")).toBe("button.host_restart");
});

test("adds display controls from 2026.12", () => {
  const brightness = (version: string) =>
    groupEntities({ config: { version }, states }, device, entries)
      .items.display.get("eDP-1")
      ?.fields.get("brightness");

  expect(brightness("2026.11.0")).toBeUndefined();
  expect(brightness("2026.12.0.dev0")).toBe(
    "number.host_display_edp_1_brightness",
  );
});
