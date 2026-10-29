/** The parts of Home Assistant's `hass` object the strategies read. */
export interface HomeAssistant {
  config: { version: string };
  states: Record<string, HassEntity | undefined>;
  /** Compared by identity to tell when the registry changed, and counted per device. */
  entities: Record<
    string,
    { entity_id: string; device_id?: string } | undefined
  >;
  devices: Record<string, DeviceRegistryEntry | undefined>;
  connection: {
    sendMessagePromise<T>(message: { type: string }): Promise<T>;
  };
}

export interface HassEntity {
  entity_id: string;
  state: string;
}

export interface DeviceRegistryEntry {
  id: string;
  name: string | null;
  name_by_user: string | null;
  identifiers: [string, string][];
  configuration_url: string | null;
}

/** An entry from `config/entity_registry/list`. */
export interface EntityRegistryEntry {
  entity_id: string;
  device_id: string | null;
  platform: string;
  unique_id: string;
  translation_key: string | null;
  original_name: string | null;
  hidden_by: string | null;
}

export interface EntityNameItem {
  type: "entity" | "device";
}

export interface TileFeatureConfig {
  type: string;
  style?: "buttons" | "slider";
  controls?: string[];
}

export interface ActionConfig {
  action: "url" | "more-info";
  url_path?: string;
}

export interface HeadingCardConfig {
  type: "heading";
  heading: string;
  heading_style?: "title" | "subtitle";
  icon?: string;
}

export interface TileCardConfig {
  type: "tile";
  entity: string;
  name?: string | EntityNameItem[];
  features?: TileFeatureConfig[];
  features_position?: "bottom" | "inline";
  state_content?: string | string[];
}

export interface HistoryGraphCardConfig {
  type: "history-graph";
  title?: string;
  hours_to_show: number;
  entities: string[];
}

export interface MarkdownCardConfig {
  type: "markdown";
  content: string;
}

export type LovelaceCardConfig =
  | HeadingCardConfig
  | TileCardConfig
  | HistoryGraphCardConfig
  | MarkdownCardConfig;

export interface EntityBadgeConfig {
  type: "entity";
  entity: string;
  name?: string;
  icon?: string;
  show_name?: boolean;
  show_state?: boolean;
  tap_action?: ActionConfig;
}

export interface LovelaceSectionConfig {
  type: "grid";
  column_span?: number;
  cards: LovelaceCardConfig[];
}

export interface LovelaceStrategySectionConfig {
  strategy: SectionStrategyConfig;
  column_span?: number;
}

export interface LovelaceViewConfig {
  type?: "sections";
  title: string;
  path?: string;
  icon?: string;
  show_icon_and_title?: boolean;
  max_columns?: number;
  badges?: EntityBadgeConfig[];
  sections?: (LovelaceSectionConfig | LovelaceStrategySectionConfig)[];
  cards?: LovelaceCardConfig[];
}

export interface LovelaceStrategyViewConfig {
  strategy: ViewStrategyConfig;
}

export interface LovelaceDashboardConfig {
  views: (LovelaceViewConfig | LovelaceStrategyViewConfig)[];
}

export const STRATEGY_TYPE = "custom:system-bridge";

export const TILE_FEATURES = ["none", "bar", "trend"] as const;

export type TileFeature = (typeof TILE_FEATURES)[number];

/** Options every strategy passes on to the sections it generates. */
export interface SectionOptions {
  /** Hours of history the graphs show. */
  hours_to_show?: number;
  /** What percentage tiles, such as CPU usage, show below their state. */
  tile_feature?: TileFeature;
  /** The Media tile's features, in order. */
  media_features?: MediaFeature[];
  /** The Audio tiles' features, in order. */
  audio_features?: AudioFeature[];
  /** Show the audio input picker. Defaults to on. */
  show_input_source?: boolean;
}

export const MEDIA_FEATURES = [
  "source",
  "playback",
  "volume_buttons",
  "volume_slider",
] as const;

export type MediaFeature = (typeof MEDIA_FEATURES)[number];

export const AUDIO_FEATURES = [
  "source",
  "volume_buttons",
  "volume_slider",
] as const;

export type AudioFeature = (typeof AUDIO_FEATURES)[number];

export const DEFAULT_MEDIA_FEATURES: MediaFeature[] = ["source", "playback"];

export const DEFAULT_AUDIO_FEATURES: AudioFeature[] = [
  "source",
  "volume_buttons",
];

interface StrategyOptions extends SectionOptions {
  type: typeof STRATEGY_TYPE;
  /** The System Bridge device. Optional when there is only one. */
  device_id?: string;
}

export interface DashboardStrategyConfig extends StrategyOptions {
  /** The pages to show, in order. Leaving it out shows every page. */
  pages?: string[];
  /** The pages that show their icon and title in the tab. Defaults to all. */
  icon_and_title_pages?: string[];
  /** The pages that show the web client link at the top. Defaults to all. */
  top_links_pages?: string[];
}

export interface ViewStrategyConfig extends StrategyOptions {
  page: string;
  show_icon_and_title?: boolean;
  show_top_links?: boolean;
}

export interface SectionStrategyConfig extends StrategyOptions {
  section: string;
  /** Which disk, mount, GPU, display or network interface, for per-item sections. */
  item?: string;
}

declare global {
  interface Window {
    customStrategies?: {
      type: string;
      name: string;
      description: string;
      documentationURL: string;
      strategyType: "dashboard" | "view" | "section";
    }[];
  }
}
