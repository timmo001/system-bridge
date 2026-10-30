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

/** Features that already show the entity's state, such as the chosen option. */
const STATE_FEATURES = new Set(["select-options", "toggle"]);

/**
 * A tile named after the entity alone, without the device name in front, or
 * after `name` when given. When a feature already shows the state, the tile
 * shows when it was last updated instead.
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

  if (features?.some(({ type }) => STATE_FEATURES.has(type))) {
    card.state_content = "last_updated";
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

/** A heading, which opens the dashboard view at `link` when given. */
export const heading = (
  text: string,
  icon?: string,
  link?: string,
): HeadingCardConfig => {
  const card: HeadingCardConfig = { type: "heading", heading: text };

  if (icon) {
    card.icon = icon;
  }

  if (link) {
    card.tap_action = { action: "navigate", navigation_path: link };
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
  ["displays_connected", "Displays"],
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
