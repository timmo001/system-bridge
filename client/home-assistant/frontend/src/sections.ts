import { heading, history, tile } from "./cards";
import type { Item, ItemKind, SystemBridgeEntities } from "./registry";
import { COMMAND_KEY_PREFIX } from "./release";
import type {
  AudioFeature,
  LovelaceCardConfig,
  LovelaceSectionConfig,
  MediaFeature,
  TileFeatureConfig,
} from "./types";

export interface SectionContext {
  entities: SystemBridgeEntities;
  item: string | undefined;
  hours: number;
  /** The features percentage tiles show, from the tile feature option. */
  percentage: TileFeatureConfig[] | undefined;
  /** The Media tile's features, in order. */
  mediaFeatures: MediaFeature[];
  /** The Audio tiles' features, in order. */
  audioFeatures: AudioFeature[];
  /** Whether the audio input tile has its picker. */
  inputSource: boolean;
  /** The dashboard view the section's heading opens. */
  link: string | undefined;
}

/** A section's cards, before they're laid out in a Home Assistant section. */
export interface SectionPart {
  cards: (LovelaceCardConfig | undefined)[];
  columnSpan?: number;
}

type SectionBuilder = (context: SectionContext) => SectionPart;

const part = (
  cards: (LovelaceCardConfig | undefined)[],
  columnSpan?: number,
): SectionPart => ({ cards, columnSpan });

/**
 * A grid section, or nothing when no card besides the headings has an entity.
 * In a wide section graphs sit in pairs, and one left on its own fills the
 * row. After tiles each pair goes in a full-width grid card, as a graph would
 * otherwise fill the gap beside the last tiles.
 */
const grid = (
  cards: (LovelaceCardConfig | undefined)[],
  columnSpan?: number,
): LovelaceSectionConfig | undefined => {
  const shown = cards.filter((card) => card !== undefined);

  if (shown.every((card) => card.type === "heading")) {
    return undefined;
  }

  const section: LovelaceSectionConfig = { type: "grid", cards: shown };

  if (columnSpan) {
    section.column_span = columnSpan;
  }

  if (columnSpan && columnSpan > 1) {
    const graphs = shown.filter((card) => card.type === "history-graph");

    const others = shown.filter((card) => card.type !== "history-graph");

    const onlyGraphs = others.every((card) => card.type === "heading");

    const pairs = Array.from(
      { length: Math.ceil(graphs.length / 2) },
      (_, index) => graphs.slice(index * 2, index * 2 + 2),
    );

    section.cards = [
      ...others,
      ...pairs.flatMap((pair): LovelaceCardConfig[] => {
        const [first, second] = pair;

        if (!first) {
          return [];
        }

        if (!second) {
          return [{ ...first, grid_options: { columns: "full" } }];
        }

        return onlyGraphs
          ? pair
          : [
              {
                type: "grid",
                columns: 2,
                square: false,
                cards: pair,
                grid_options: { columns: "full" },
              },
            ];
      }),
    ];
  }

  return section;
};

/**
 * Several sections in one, in the order given, as wide as the widest. Each is
 * laid out on its own, so its graphs stay with its tiles, and one with nothing
 * to show leaves no heading behind.
 */
export const joinSections = (
  parts: readonly SectionPart[],
): LovelaceSectionConfig | undefined => {
  const columnSpan =
    Math.max(0, ...parts.map(({ columnSpan: span }) => span ?? 0)) || undefined;

  const cards = parts.flatMap(
    ({ cards: partCards }) => grid(partCards, columnSpan)?.cards ?? [],
  );

  if (cards.length === 0) {
    return undefined;
  }

  const section: LovelaceSectionConfig = { type: "grid", cards };

  if (columnSpan) {
    section.column_span = columnSpan;
  }

  return section;
};

const singles = ({ single }: SystemBridgeEntities, ...keys: string[]) =>
  keys.flatMap((key) => single.get(key) ?? []);

const fields = (item: Item | undefined, ...names: string[]) =>
  names.flatMap((name) => item?.fields.get(name) ?? []);

const fromItems = (
  { items }: SystemBridgeEntities,
  kind: ItemKind,
  name: string,
) => [...items[kind].values()].flatMap((item) => fields(item, name));

/** A history graph, or nothing when none of its entities exist. */
const graph = (entities: string[], hours: number, title?: string) =>
  entities.length > 0 ? history(entities, hours, title) : undefined;

const tileOf = (entity: string | undefined) =>
  entity ? tile(entity) : undefined;

const percentageOf = (
  entity: string | undefined,
  percentage: TileFeatureConfig[] | undefined,
) => (entity ? tile(entity, percentage) : undefined);

const MEDIA_FEATURE_CONFIGS: Record<MediaFeature, TileFeatureConfig> = {
  source: { type: "media-player-source" },
  // Controls the player can't use are left out by the feature itself
  playback: {
    type: "media-player-playback",
    controls: [
      "shuffle",
      "media_previous_track",
      "media_play_pause",
      "media_stop",
      "media_next_track",
      "repeat",
    ],
  },
  volume_buttons: { type: "media-player-volume-buttons" },
  volume_slider: { type: "media-player-volume-slider" },
};

const mediaFeatures = (features: readonly MediaFeature[]) =>
  features.map((feature) => MEDIA_FEATURE_CONFIGS[feature]);

/** A player tile with its first feature inline, so it fills the section's width. */
const playerTile = (entity: string, features: readonly MediaFeature[]) => ({
  ...tile(entity, mediaFeatures(features)),
  features_position: "inline" as const,
});

/**
 * Tiles for an item's fields, named without the heading above them, so a
 * GPU's tiles read "Usage %" rather than repeating the GPU's name.
 */
const itemTiles = (
  item: Item | undefined,
  itemHeading: string,
  names: string[],
  features?: TileFeatureConfig[],
) =>
  names.flatMap((name) => {
    const entity = item?.fields.get(name);

    if (!entity) {
      return [];
    }

    const label = item?.labels.get(name);

    const rest = label?.startsWith(itemHeading)
      ? label.slice(itemHeading.length).trim()
      : "";

    return [
      tile(
        entity,
        features,
        rest ? `${rest.charAt(0).toUpperCase()}${rest.slice(1)}` : undefined,
      ),
    ];
  });

export const SECTIONS = {
  storage: ({ entities, link }) =>
    part([
      heading("Storage", "mdi:harddisk", link),
      ...fromItems(entities, "mount", "space_used").map((entity) =>
        tile(entity),
      ),
    ]),

  audio: ({ entities, audioFeatures: audio, link }) =>
    part([
      heading("Audio", "mdi:volume-high", link),
      ...singles(entities, "audio").map((entity) => playerTile(entity, audio)),
    ]),

  "now-playing": ({ entities, mediaFeatures: media, link }) =>
    part([
      heading("Now playing", "mdi:play-circle-outline", link),
      ...singles(entities, "media").map((entity) => playerTile(entity, media)),
    ]),

  "audio-outputs": ({ entities, audioFeatures: audio }) =>
    part([
      heading("Outputs", "mdi:speaker"),
      ...singles(entities, "audio").map((entity) => playerTile(entity, audio)),
      // Each output has no source of its own
      ...fromItems(entities, "audio_output", "audio_output").map((entity) =>
        tile(
          entity,
          mediaFeatures(audio.filter((feature) => feature !== "source")),
        ),
      ),
    ]),

  "audio-inputs": ({ entities, inputSource }) =>
    part([
      heading("Inputs", "mdi:microphone"),
      ...singles(entities, "audio_input").map((entity) =>
        tile(entity, inputSource ? [{ type: "select-options" }] : []),
      ),
      ...[...entities.items.audio_input.values()].flatMap((item) => [
        ...fields(item, "volume").map((entity) =>
          tile(entity, [{ type: "numeric-input", style: "slider" }]),
        ),
        ...fields(item, "mute").map((entity) => tile(entity)),
      ]),
    ]),

  "overview-load": ({ entities, hours, link }) =>
    part([
      heading("CPU and memory", "mdi:cpu-64-bit", link),
      graph(
        singles(entities, "processes_load", "memory_used_percentage"),
        hours,
      ),
    ]),

  "overview-power": ({ entities, hours, link }) => {
    const power = singles(entities, "power_usage", "cpu_power_package");

    return part([
      heading("Power", "mdi:flash", link),
      ...power.map((entity) => tile(entity)),
      graph(power, hours),
    ]);
  },

  "overview-temperatures": ({ entities, hours, link }) => {
    // TODO(Core): add the sensors module's temperatures and fans once Core has
    // them (Core roadmap note, "Core features: sensors module")
    const temperatures = [
      ...singles(entities, "cpu_temperature"),
      ...fromItems(entities, "gpu", "temperature"),
    ];

    return part([
      heading("Temperatures", "mdi:thermometer", link),
      ...temperatures.map((entity) => tile(entity)),
      graph(temperatures, hours),
    ]);
  },

  battery: ({ entities, percentage }) =>
    part([
      heading("Battery", "mdi:battery"),
      percentageOf(entities.single.get("battery"), percentage),
      ...singles(
        entities,
        "battery_state",
        "battery_time_remaining",
        "battery_is_charging",
        "ac_connected",
        "battery_power",
        "battery_voltage",
      ).map((entity) => tile(entity)),
    ]),

  "device-batteries": ({ entities, percentage }) =>
    part([
      heading("Devices", "mdi:battery-bluetooth"),
      ...[...entities.items.battery.values()].flatMap((battery) => [
        ...fields(battery, "battery_info").map((entity) =>
          tile(entity, percentage),
        ),
        ...fields(battery, "state").map((entity) => tile(entity)),
      ]),
    ]),

  cpu: ({ entities, percentage }) =>
    part([
      heading("Usage", "mdi:cpu-64-bit"),
      percentageOf(entities.single.get("processes_load"), percentage),
      ...singles(
        entities,
        "cpu_speed",
        "cpu_power_package",
        "load_average",
        "cpu_temperature",
        "cpu_voltage",
      ).map((entity) => tile(entity)),
    ]),

  "cpu-history": ({ entities, hours }) =>
    part(
      [
        heading("Usage over time"),
        graph(singles(entities, "processes_load"), hours, "Usage"),
        graph(singles(entities, "cpu_speed"), hours, "Frequency"),
        graph(singles(entities, "cpu_power_package"), hours, "Power"),
        graph(
          singles(
            entities,
            "load_average",
            "load_average_5",
            "load_average_15",
          ),
          hours,
          "Load average",
        ),
        graph(singles(entities, "cpu_temperature"), hours, "Temperature"),
      ],
      2,
    ),

  "cpu-cores": ({ entities }) =>
    part([
      heading("Cores"),
      ...fromItems(entities, "core", "processes_load_cpu").map((entity) =>
        tile(entity),
      ),
      ...fromItems(entities, "core", "cpu_power_core").map((entity) =>
        tile(entity),
      ),
    ]),

  memory: ({ entities, percentage }) =>
    part([
      heading("In use", "mdi:memory"),
      percentageOf(entities.single.get("memory_used_percentage"), percentage),
      ...singles(entities, "memory_free", "memory_used").map((entity) =>
        tile(entity),
      ),
      percentageOf(entities.single.get("swap_used_percentage"), percentage),
      tileOf(entities.single.get("swap_used")),
    ]),

  "memory-history": ({ entities, hours }) =>
    part(
      [
        heading("Usage over time"),
        graph(
          singles(entities, "memory_used_percentage", "swap_used_percentage"),
          hours,
        ),
      ],
      2,
    ),

  // TODO(Core): add the disk's temperature once Core has it (Core roadmap
  // note, "Core features: disk temperature")
  mount: ({ entities, item, percentage }) => {
    const mount =
      item === undefined ? undefined : entities.items.mount.get(item);

    const name = mount?.name ?? "";

    return part([
      heading(name, "mdi:harddisk"),
      ...itemTiles(mount, name, ["space_used"], percentage),
    ]);
  },

  "disk-activity": ({ entities, hours }) => {
    const totals = singles(entities, "disk_read_rate", "disk_write_rate");

    return part(
      [
        heading("Activity", "mdi:swap-vertical"),
        ...totals.map((entity) => tile(entity)),
        graph(totals, hours),
        graph(
          [...entities.items.disk.values()].flatMap((disk) =>
            fields(disk, "read_rate", "write_rate"),
          ),
          hours,
          "Per disk",
        ),
      ],
      2,
    );
  },

  display: ({ entities, item }) => {
    const display =
      item === undefined ? undefined : entities.items.display.get(item);

    const name = `Display ${display?.name ?? ""}`;

    return part([
      heading(name, "mdi:monitor"),
      ...itemTiles(display, name, ["power"], [{ type: "toggle" }]),
      ...itemTiles(
        display,
        name,
        ["brightness"],
        [{ type: "numeric-input", style: "slider" }],
      ),
      ...itemTiles(display, name, [
        "resolution_x",
        "resolution_y",
        "refresh_rate",
      ]),
    ]);
  },

  gpu: ({ entities, item, hours, percentage }) => {
    const gpu = item === undefined ? undefined : entities.items.gpu.get(item);

    const name = gpu?.name ?? "";

    return part(
      [
        heading(name, "mdi:expansion-card-variant"),
        ...itemTiles(
          gpu,
          name,
          [
            "usage_percentage",
            "memory_used_percentage",
            "encoder_usage_percentage",
            "decoder_usage_percentage",
          ],
          percentage,
        ),
        ...itemTiles(gpu, name, [
          "memory_used",
          "memory_free",
          "memory_total",
          "power_usage",
          "power_limit",
          "temperature",
          "core_clock_speed",
          "memory_clock_speed",
          "fan_speed",
          "fan_speed_percentage",
          "performance_state",
        ]),
        graph(
          fields(
            gpu,
            "usage_percentage",
            "encoder_usage_percentage",
            "decoder_usage_percentage",
          ),
          hours,
          "Load",
        ),
        graph(fields(gpu, "memory_used_percentage"), hours, "Memory"),
        graph(fields(gpu, "power_usage"), hours, "Power"),
        graph(fields(gpu, "temperature"), hours, "Temperature"),
      ],
      2,
    );
  },

  network: ({ entities, hours, link }) => {
    const rates = singles(
      entities,
      "network_download_rate",
      "network_upload_rate",
    );

    return part([
      heading("Network", "mdi:lan", link),
      ...rates.map((entity) => tile(entity)),
      graph(rates, hours),
    ]);
  },

  "network-activity": ({ entities, hours }) => {
    const download = singles(entities, "network_download_rate");
    const upload = singles(entities, "network_upload_rate");

    return part(
      [
        heading("Network", "mdi:lan"),
        ...[...download, ...upload].map((entity) => tile(entity)),
        graph(download, hours, "Download"),
        graph(upload, hours, "Upload"),
      ],
      2,
    );
  },

  interface: ({ entities, item, hours }) => {
    const networkInterface =
      item === undefined ? undefined : entities.items.interface.get(item);

    const name = networkInterface?.name ?? "";

    return part(
      [
        heading(name, "mdi:ethernet"),
        ...itemTiles(networkInterface, name, [
          "download_rate",
          "upload_rate",
          "ssid",
          "signal_strength",
          "link_rate",
        ]),
        graph(fields(networkInterface, "download_rate"), hours, "Download"),
        graph(fields(networkInterface, "upload_rate"), hours, "Upload"),
      ],
      2,
    );
  },

  desktop: ({ entities, hours }) =>
    part(
      [
        heading("Session", "mdi:account-clock-outline"),
        ...singles(entities, "locked", "idle_time").map((entity) =>
          tile(entity),
        ),
        graph(singles(entities, "idle_time"), hours),
      ],
      2,
    ),

  processes: ({ entities, hours }) =>
    part(
      [
        heading("Processes", "mdi:application-cog-outline"),
        tileOf(entities.single.get("processes_count")),
        graph(singles(entities, "processes_count"), hours),
      ],
      2,
    ),

  "power-commands": ({ entities }) =>
    part([
      heading("Commands", "mdi:power"),
      ...singles(
        entities,
        "power_lock",
        "power_logout",
        "power_sleep",
        "power_hibernate",
        "power_restart",
        "power_shutdown",
      ).map((entity) => tile(entity)),
    ]),

  "saved-commands": ({ entities }) =>
    part([
      heading("Saved commands", "mdi:console"),
      ...[...entities.single].flatMap(([key, entity]) =>
        key.startsWith(COMMAND_KEY_PREFIX) ? [tile(entity)] : [],
      ),
    ]),

  notifications: ({ entities }) =>
    part([
      heading("Notifications", "mdi:bell-outline"),
      tileOf(entities.single.get("notify")),
      // The last event, such as clicked or closed, and when it happened
      ...singles(entities, "notification").map((entity) => ({
        ...tile(entity),
        state_content: ["event_type", "last_changed"],
      })),
    ]),

  power: ({ entities }) =>
    part([
      heading("Power", "mdi:lightning-bolt"),
      ...singles(entities, "power_profile").map((entity) =>
        tile(entity, [{ type: "select-options" }]),
      ),
      ...singles(entities, "keep_awake").map((entity) =>
        tile(entity, [{ type: "toggle" }]),
      ),
    ]),

  system: ({ entities }) =>
    part([
      heading("Device", "mdi:information-outline"),
      ...singles(entities, "power_usage", "camera_in_use").map((entity) =>
        tile(entity),
      ),
    ]),
} as const satisfies Record<string, SectionBuilder>;

export type SectionName = keyof typeof SECTIONS;

export const isSectionName = (name: string): name is SectionName =>
  Object.hasOwn(SECTIONS, name);
