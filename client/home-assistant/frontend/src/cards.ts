import type { SystemBridgeEntities } from "./registry";
import type {
  EntityBadgeConfig,
  HeadingCardConfig,
  HistoryGraphCardConfig,
  TileCardConfig,
  TileFeature,
  TileFeatureConfig,
} from "./types";

export const DEFAULT_HOURS_TO_SHOW = 1;

/**
 * A tile named after the entity alone, without the device name in front, or
 * after `name` when given.
 */
export const tile = (
  entity: string,
  features?: TileFeatureConfig[],
  name?: string,
): TileCardConfig => {
  const card: TileCardConfig = {
    type: "tile",
    entity,
    name: name ?? [{ type: "entity" }],
  };

  if (features) {
    card.features = features;
  }

  return card;
};

export const DEFAULT_TILE_FEATURE: TileFeature = "bar";

/** The tile features for a percentage tile's chosen feature. */
export const percentageFeatures = (
  feature: TileFeature,
): TileFeatureConfig[] | undefined => {
  switch (feature) {
    case "bar":
      return [{ type: "bar-gauge" }];
    case "trend":
      return [{ type: "trend-graph" }];
    case "none":
      return undefined;
  }
};

export const heading = (text: string, icon?: string): HeadingCardConfig => {
  const card: HeadingCardConfig = { type: "heading", heading: text };

  if (icon) {
    card.icon = icon;
  }

  return card;
};

export const history = (
  entities: string[],
  hoursToShow: number,
  title?: string,
): HistoryGraphCardConfig => {
  const card: HistoryGraphCardConfig = {
    type: "history-graph",
    hours_to_show: hoursToShow,
    entities,
  };

  if (title) {
    card.title = title;
  }

  return card;
};

/** A badge that opens the page in the System Bridge web client. */
export const webClientBadge = (
  entities: SystemBridgeEntities,
  page: string,
  title: string,
): EntityBadgeConfig[] => {
  const version = entities.single.get("version");

  if (!entities.webClientUrl || !version) {
    return [];
  }

  return [
    {
      type: "entity",
      entity: version,
      name: `${title} | System Bridge`,
      icon: "mdi:open-in-new",
      show_name: true,
      show_state: false,
      tap_action: {
        action: "url",
        url_path: `${entities.webClientUrl}/${page === "overview" ? "" : page}`,
      },
    },
  ];
};

const DIAGNOSTIC_BADGES: readonly [key: string, name: string][] = [
  ["update", "Update"],
  ["version", "Version"],
  ["os", "OS"],
  ["kernel", "Kernel"],
  ["boot_time", "Booted"],
  ["pending_reboot", "Pending reboot"],
];

export const diagnosticBadges = (
  entities: SystemBridgeEntities,
): EntityBadgeConfig[] =>
  DIAGNOSTIC_BADGES.flatMap(([key, name]) => {
    const entity = entities.single.get(key);

    return entity
      ? [{ type: "entity", entity, name, show_name: true, show_state: true }]
      : [];
  });
