import { isAtLeast, MINIMUM_RELEASE, RELEASE_GATES } from "./release";
import type {
  DeviceRegistryEntry,
  EntityRegistryEntry,
  HomeAssistant,
} from "./types";

const DOMAIN = "system_bridge";

export type ItemKind =
  "core" | "disk" | "display" | "gpu" | "interface" | "mount";

/**
 * Core gives every System Bridge entity the unique ID `<system uuid>_<key>`.
 * Entities for a disk, mount, GPU and so on put the item between a key prefix
 * and the field, and their translation key names the field, so the item is
 * whatever sits between the two. See `sensor.py` in Core's `system_bridge`.
 */
const ITEM_RULES: readonly {
  kind: ItemKind;
  translationPrefix: string;
  keyPrefix: string;
}[] = [
  { kind: "mount", translationPrefix: "space_used", keyPrefix: "filesystem_" },
  { kind: "disk", translationPrefix: "disk_device_", keyPrefix: "disk_" },
  {
    kind: "interface",
    translationPrefix: "network_interface_",
    keyPrefix: "network_",
  },
  { kind: "gpu", translationPrefix: "gpu_", keyPrefix: "gpu_" },
  { kind: "display", translationPrefix: "display_", keyPrefix: "display_" },
  {
    kind: "core",
    translationPrefix: "processes_load_cpu",
    keyPrefix: "processes_load_cpu_",
  },
  {
    kind: "core",
    translationPrefix: "cpu_power_core",
    keyPrefix: "cpu_power_core_",
  },
];

export interface Item {
  name: string;
  /** Field, such as `read_rate` or `usage_percentage`, to entity ID. */
  fields: Map<string, string>;
  /** Field to the entity's name from Core, such as `eno1 download rate`. */
  labels: Map<string, string>;
}

export interface SystemBridgeEntities {
  device: DeviceRegistryEntry;
  /** The web client's origin, from the device's configuration URL. */
  webClientUrl: string | undefined;
  /** Key, such as `processes_load` or `media`, to entity ID. */
  single: Map<string, string>;
  items: Record<ItemKind, Map<string, Item>>;
}

export const systemBridgeUuid = (device: DeviceRegistryEntry) =>
  device.identifiers.find(([domain]) => domain === DOMAIN)?.[1];

export const findDevices = (hass: Pick<HomeAssistant, "devices">) =>
  Object.values(hass.devices).filter(
    (device): device is DeviceRegistryEntry =>
      device !== undefined && systemBridgeUuid(device) !== undefined,
  );

export type DeviceResult =
  | { device: DeviceRegistryEntry }
  | { error: "release" | "none" | "several" | "not_found" };

/**
 * The configured device, or the only System Bridge device when none is set,
 * once Home Assistant is at the minimum release.
 */
export const resolveDevice = (
  hass: Pick<HomeAssistant, "config" | "devices">,
  deviceId: string | undefined,
): DeviceResult => {
  if (!isAtLeast(hass.config.version, MINIMUM_RELEASE)) {
    return { error: "release" };
  }

  const devices = findDevices(hass);

  if (deviceId) {
    const device = devices.find(({ id }) => id === deviceId);

    return device ? { device } : { error: "not_found" };
  }

  const [device, ...others] = devices;

  if (!device) {
    return { error: "none" };
  }

  return others.length > 0 ? { error: "several" } : { device };
};

const itemOf = (key: string, translationKey: string | null) => {
  if (!translationKey) {
    return undefined;
  }

  for (const rule of ITEM_RULES) {
    if (
      !translationKey.startsWith(rule.translationPrefix) ||
      !key.startsWith(rule.keyPrefix)
    ) {
      continue;
    }

    const field = translationKey.slice(rule.translationPrefix.length);

    const id = key.slice(
      rule.keyPrefix.length,
      field ? -(field.length + 1) : undefined,
    );

    return { kind: rule.kind, id, field: field || translationKey };
  }

  return undefined;
};

/** The words every name starts with, such as a GPU's name before its field. */
const commonPrefix = (names: string[]) => {
  const [first, ...rest] = names.map((name) => name.split(" "));

  if (!first || rest.length === 0) {
    return undefined;
  }

  const length = first.findIndex((word, index) =>
    rest.some((words) => words[index] !== word),
  );

  return (
    (length === -1 ? first : first.slice(0, length)).join(" ") || undefined
  );
};

/**
 * Group a device's entities by their key. Hidden entities are left out, and so
 * are disabled ones, which have no state for a card to show, and ones from a
 * Core release newer than the one running.
 */
export const groupEntities = (
  hass: Pick<HomeAssistant, "config" | "states">,
  device: DeviceRegistryEntry,
  entries: readonly EntityRegistryEntry[],
): SystemBridgeEntities => {
  const uuid = systemBridgeUuid(device) ?? "";
  const single = new Map<string, string>();

  const items: SystemBridgeEntities["items"] = {
    core: new Map(),
    disk: new Map(),
    display: new Map(),
    gpu: new Map(),
    interface: new Map(),
    mount: new Map(),
  };

  for (const entry of entries) {
    const release = entry.translation_key
      ? RELEASE_GATES.get(entry.translation_key)
      : undefined;

    if (
      (release !== undefined && !isAtLeast(hass.config.version, release)) ||
      entry.platform !== DOMAIN ||
      entry.device_id !== device.id ||
      entry.hidden_by !== null ||
      hass.states[entry.entity_id] === undefined ||
      !entry.unique_id.startsWith(uuid)
    ) {
      continue;
    }

    const key = entry.unique_id.slice(uuid.length + 1);
    const item = itemOf(key, entry.translation_key);

    if (!item) {
      // The notify entity has no key, so it goes by its domain
      single.set(
        key || entry.entity_id.slice(0, entry.entity_id.indexOf(".")),
        entry.entity_id,
      );
      continue;
    }

    const existing = items[item.kind].get(item.id) ?? {
      name: item.id,
      fields: new Map(),
      labels: new Map(),
    };

    existing.fields.set(item.field, entry.entity_id);

    if (entry.original_name) {
      existing.labels.set(item.field, entry.original_name);
    }

    items[item.kind].set(item.id, existing);
  }

  for (const [id, gpu] of items.gpu) {
    gpu.name = commonPrefix([...gpu.labels.values()]) ?? `GPU ${id}`;
  }

  return {
    device,
    // Older devices still have the old `/app/settings.html` configuration URL
    webClientUrl: device.configuration_url
      ? URL.parse(device.configuration_url)?.origin
      : undefined,
    single,
    items,
  };
};

let registryCache:
  | {
      entities: HomeAssistant["entities"];
      entries: Promise<EntityRegistryEntry[]>;
    }
  | undefined;

/**
 * The full entity registry, with unique IDs. `hass.entities` leaves those out.
 * The dashboard, its views and every section ask for it, so it's fetched once
 * for each change to the registry.
 */
const fetchEntityRegistry = (hass: HomeAssistant) => {
  if (registryCache?.entities !== hass.entities) {
    registryCache = {
      entities: hass.entities,
      entries: hass.connection.sendMessagePromise<EntityRegistryEntry[]>({
        type: "config/entity_registry/list",
      }),
    };
  }

  return registryCache.entries;
};

export const getSystemBridgeEntities = async (
  hass: HomeAssistant,
  device: DeviceRegistryEntry,
) => groupEntities(hass, device, await fetchEntityRegistry(hass));
