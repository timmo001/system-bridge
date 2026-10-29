import { heading, history, tile } from "./cards";
import type { Item, ItemKind, SystemBridgeEntities } from "./registry";
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
}

type SectionBuilder = (
  context: SectionContext,
) => LovelaceSectionConfig | undefined;

/** A grid section, or nothing when no card besides the headings has an entity. */
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
  storage: ({ entities }) =>
    grid([
      heading("Storage", "mdi:harddisk"),
      ...fromItems(entities, "mount", "space_used").map((entity) =>
        tile(entity),
      ),
    ]),

  audio: ({ entities, audioFeatures: audio }) =>
    grid([
      heading("Audio", "mdi:volume-high"),
      ...singles(entities, "audio").map((entity) => playerTile(entity, audio)),
    ]),

  "now-playing": ({ entities, mediaFeatures: media }) =>
    grid([
      heading("Now playing", "mdi:play-circle-outline"),
      ...singles(entities, "media").map((entity) => playerTile(entity, media)),
    ]),

  "audio-outputs": ({ entities, audioFeatures: audio }) =>
    grid([
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
    grid([
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

  "overview-load": ({ entities, hours }) =>
    grid([
      heading("CPU and memory", "mdi:cpu-64-bit"),
      graph(
        singles(entities, "processes_load", "memory_used_percentage"),
        hours,
      ),
    ]),

  "overview-power": ({ entities, hours }) => {
    const power = singles(entities, "power_usage", "cpu_power_package");

    return grid([
      heading("Power", "mdi:flash"),
      ...power.map((entity) => tile(entity)),
      graph(power, hours),
    ]);
  },

  "overview-temperatures": ({ entities, hours }) => {
    // TODO(Core): add the sensors module's temperatures and fans once Core has
    // them (Core roadmap note, "Core features: sensors module")
    const temperatures = [
      ...singles(entities, "cpu_temperature"),
      ...fromItems(entities, "gpu", "temperature"),
    ];

    return grid([
      heading("Temperatures", "mdi:thermometer"),
      ...temperatures.map((entity) => tile(entity)),
      graph(temperatures, hours),
    ]);
  },

  battery: ({ entities, percentage }) =>
    grid([
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
    grid([
      heading("Devices", "mdi:battery-bluetooth"),
      ...[...entities.items.battery.values()].flatMap((battery) => [
        ...fields(battery, "battery_info").map((entity) =>
          tile(entity, percentage),
        ),
        ...fields(battery, "state").map((entity) => tile(entity)),
      ]),
    ]),

  cpu: ({ entities, percentage }) =>
    grid([
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
    grid(
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
    grid([
      heading("Cores"),
      ...fromItems(entities, "core", "processes_load_cpu").map((entity) =>
        tile(entity),
      ),
      ...fromItems(entities, "core", "cpu_power_core").map((entity) =>
        tile(entity),
      ),
    ]),

  memory: ({ entities, percentage }) =>
    grid([
      heading("In use", "mdi:memory"),
      percentageOf(entities.single.get("memory_used_percentage"), percentage),
      ...singles(entities, "memory_free", "memory_used").map((entity) =>
        tile(entity),
      ),
      percentageOf(entities.single.get("swap_used_percentage"), percentage),
      tileOf(entities.single.get("swap_used")),
    ]),

  "memory-history": ({ entities, hours }) =>
    grid(
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

    return grid([
      heading(name, "mdi:harddisk"),
      ...itemTiles(mount, name, ["space_used"], percentage),
    ]);
  },

  "disk-activity": ({ entities, hours }) => {
    const totals = singles(entities, "disk_read_rate", "disk_write_rate");

    return grid([
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
    ]);
  },

  display: ({ entities, item }) => {
    const display =
      item === undefined ? undefined : entities.items.display.get(item);

    const name = `Display ${display?.name ?? ""}`;

    return grid([
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

    return grid([
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
          "memory_used_percentage",
          "encoder_usage_percentage",
          "decoder_usage_percentage",
        ),
        hours,
        "Load over time",
      ),
      graph(
        fields(gpu, "power_usage", "temperature"),
        hours,
        "Power and temperature",
      ),
    ]);
  },

  network: ({ entities, hours }) => {
    const rates = singles(
      entities,
      "network_download_rate",
      "network_upload_rate",
    );

    return grid([
      heading("Network", "mdi:lan"),
      ...rates.map((entity) => tile(entity)),
      graph(rates, hours),
    ]);
  },

  interface: ({ entities, item, hours }) => {
    const networkInterface =
      item === undefined ? undefined : entities.items.interface.get(item);

    const name = networkInterface?.name ?? "";

    return grid([
      heading(name, "mdi:ethernet"),
      ...itemTiles(networkInterface, name, [
        "download_rate",
        "upload_rate",
        "ssid",
        "signal_strength",
        "link_rate",
      ]),
      graph(fields(networkInterface, "download_rate", "upload_rate"), hours),
    ]);
  },

  desktop: ({ entities, hours }) =>
    grid([
      heading("Session", "mdi:account-clock-outline"),
      ...singles(entities, "locked", "idle_time").map((entity) => tile(entity)),
      graph(singles(entities, "idle_time"), hours),
    ]),

  processes: ({ entities, hours }) =>
    grid([
      heading("Processes", "mdi:application-cog-outline"),
      tileOf(entities.single.get("processes_count")),
      graph(singles(entities, "processes_count"), hours),
    ]),

  // TODO(Core): add the saved command buttons with roadmap item 7b
  commands: ({ entities }) =>
    grid([
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

  // TODO(Core): add a "Power" section for the power profile select and keep
  // awake switch (connector 5.20.0 follow-ups), and a "Health" section for
  // failed units and pending packages with roadmap item 8
  system: ({ entities }) =>
    grid([
      heading("Device", "mdi:information-outline"),
      ...singles(entities, "power_usage", "camera_in_use").map((entity) =>
        tile(entity),
      ),
    ]),
} as const satisfies Record<string, SectionBuilder>;

export type SectionName = keyof typeof SECTIONS;

export const isSectionName = (name: string): name is SectionName =>
  Object.hasOwn(SECTIONS, name);
