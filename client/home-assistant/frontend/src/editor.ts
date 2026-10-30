import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { DEFAULT_HOURS_TO_SHOW, DEFAULT_TILE_FEATURE } from "./cards";
import { PAGES } from "./pages";
import {
  getSystemBridgeEntities,
  type ItemKind,
  resolveDevice,
  type SystemBridgeEntities,
} from "./registry";
import { isAtLeast, PAGE_RELEASES, SECTION_RELEASES } from "./release";
import { isSectionName, type SectionName } from "./sections";
import { sectionImage } from "./section-images";
import {
  AUDIO_FEATURES,
  type DashboardStrategyConfig,
  DEFAULT_AUDIO_FEATURES,
  DEFAULT_MEDIA_FEATURES,
  type HomeAssistant,
  MEDIA_FEATURES,
  type SectionStrategyConfig,
  TILE_FEATURES,
  type ViewStrategyConfig,
} from "./types";

type StrategyConfig =
  DashboardStrategyConfig | ViewStrategyConfig | SectionStrategyConfig;

const LABELS = new Map([
  ["device_id", "Device"],
  ["hours_to_show", "History"],
  ["tile_feature", "Percentage tiles"],
  ["page", "Page"],
  ["section", "Section"],
  ["item", "Item"],
  ["show_icon_and_title", "Icon and title"],
  ["show_top_links", "Web client link"],
  ["pages_options", "Page options"],
  ["pages", "Pages"],
  ["icon_and_title_pages", "Icon and title"],
  ["top_links_pages", "Web client link"],
  ["media_options", "Media"],
  ["media_features", "Media tile"],
  ["audio_options", "Audio"],
  ["audio_features", "Audio tiles"],
  ["show_input_source", "Audio input picker"],
]);

const FEATURE_LABELS = new Map([
  ["source", "Source"],
  ["playback", "Playback"],
  ["volume_buttons", "Volume buttons"],
  ["volume_slider", "Volume slider"],
]);

const featuresSelector = (features: readonly string[]) => ({
  select: {
    multiple: true,
    reorder: true,
    mode: "dropdown",
    options: features.map((value) => ({
      value,
      label: FEATURE_LABELS.get(value) ?? value,
    })),
  },
});

const TILE_FEATURE_LABELS = new Map([
  ["none", "None"],
  ["bar", "Bar"],
  ["trend", "Trend"],
]);

const TILE_FEATURE_DESCRIPTIONS = new Map([
  ["none", "Only the value"],
  ["bar", "The percentage as a bar"],
  ["trend", "Recent values as a graph"],
]);

/** What a tile with each feature looks like, in the style of the built-in select box images. */
const TILE_FEATURE_DRAWINGS = new Map([
  ["none", () => ""],
  [
    "bar",
    (ink: string) =>
      `<rect x="8" y="32" width="78" height="6" rx="3" fill="${ink}" fill-opacity="0.24"/><rect x="8" y="32" width="46" height="6" rx="3" fill="${ink}" fill-opacity="0.48"/>`,
  ],
  [
    "trend",
    (ink: string) =>
      `<path d="M8 37 L20 33 L32 36 L46 30 L60 34 L72 29 L86 32" stroke="${ink}" stroke-opacity="0.72" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  ],
]);

const tileFeatureImage = (value: string, dark: boolean) => {
  const base = dark ? "#1C1C1C" : "white";
  const ink = dark ? "white" : "black";
  const feature = TILE_FEATURE_DRAWINGS.get(value)?.(ink) ?? "";
  const svg = `<svg width="94" height="44" viewBox="0 0 94 44" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="94" height="44" rx="8" fill="${base}"/><rect x="0.5" y="0.5" width="93" height="43" rx="7.5" stroke="${ink}" stroke-opacity="${dark ? 0.24 : 0.12}"/><circle cx="17" cy="15" r="7" fill="${ink}" fill-opacity="${dark ? 0.24 : 0.12}"/><rect x="30" y="9" width="30" height="3" rx="1.5" fill="${ink}" fill-opacity="${dark ? 0.72 : 0.48}"/><rect x="30" y="16" width="20" height="3" rx="1.5" fill="${ink}" fill-opacity="${dark ? 0.48 : 0.32}"/>${feature}</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

/** Defaults the editor shows, and leaves out of the saved config. */
const DEFAULTS = {
  hours_to_show: DEFAULT_HOURS_TO_SHOW,
  tile_feature: DEFAULT_TILE_FEATURE,
  show_icon_and_title: true,
  show_top_links: true,
  show_input_source: true,
  media_features: DEFAULT_MEDIA_FEATURES,
  audio_features: DEFAULT_AUDIO_FEATURES,
};

const ALL_PAGES = PAGES.map(({ page }) => page);

/** Whether Home Assistant has the entities a page or section needs. */
const isReleased = (version: string | undefined, release: string | undefined) =>
  release === undefined ||
  (version !== undefined && isAtLeast(version, release));

/** Pages hidden from the editor until Home Assistant has their entities. */
const hiddenPages = (version: string | undefined) =>
  new Set(
    ALL_PAGES.filter((page) => !isReleased(version, PAGE_RELEASES.get(page))),
  );

/**
 * A page list from the editor, with the hidden pages put back where they were,
 * so they show once Home Assistant has their entities.
 */
const withHiddenPages = (
  list: readonly string[],
  previous: readonly string[],
  hidden: ReadonlySet<string>,
) => {
  const result = list.filter((page) => !hidden.has(page));
  let anchor: string | undefined;

  for (const page of previous) {
    if (hidden.has(page)) {
      result.splice(
        anchor === undefined ? 0 : result.indexOf(anchor) + 1,
        0,
        page,
      );
    }

    if (result.includes(page)) {
      anchor = page;
    }
  }

  return result;
};

const pagesSelector = (reorder: boolean, pages: readonly string[]) => ({
  select: {
    multiple: true,
    reorder,
    mode: "dropdown",
    options: PAGES.filter(({ page }) => pages.includes(page)).map(
      ({ page, title }) => ({ value: page, label: title }),
    ),
  },
});

const pagesSchema = (pages: readonly string[]) => [
  {
    name: "pages_options",
    type: "expandable",
    flatten: true,
    expanded: true,
    schema: [
      { name: "pages", selector: pagesSelector(true, pages) },
      { name: "icon_and_title_pages", selector: pagesSelector(false, pages) },
      { name: "top_links_pages", selector: pagesSelector(false, pages) },
    ],
  },
];

const SECTION_ACRONYMS = new Map([
  ["cpu", "CPU"],
  ["gpu", "GPU"],
]);

/** "cpu-cores" reads as "CPU cores". */
const sectionLabel = (name: string) => {
  const [first = "", ...rest] = name.split("-").map((word) => {
    return SECTION_ACRONYMS.get(word) ?? word;
  });

  return [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(" ");
};

const SECTION_DESCRIPTIONS: Record<SectionName, string> = {
  storage: "Space used on every mount.",
  audio: "The default audio output, with its output picker and volume.",
  "now-playing": "The media playing, with source and playback controls.",
  "audio-outputs": "Volume of each audio output, such as speakers.",
  "audio-inputs": "Volume of each audio input, such as a microphone.",
  "overview-load": "CPU and memory load in one graph.",
  "overview-power": "Power draw, with a graph.",
  "overview-temperatures": "CPU and GPU temperatures, with a graph.",
  battery:
    "Battery level, state, time remaining, AC power, power draw and voltage.",
  "device-batteries":
    "Battery level and state of connected devices, such as a wireless mouse.",
  cpu: "CPU usage, speed, power, load average, temperature and voltage.",
  "cpu-history":
    "Graphs of CPU usage, speed, power, load average and temperature.",
  "cpu-cores": "Load and power of each CPU core.",
  memory: "Memory and swap in use, free and used.",
  "memory-history": "Graph of memory and swap usage.",
  mount: "One mount point: space used. Set the item to the mount point.",
  "disk-activity": "Disk read and write rates, in total and per disk.",
  display:
    "One display: power, brightness, resolution and refresh rate. Set the item to the display name.",
  gpu: "One GPU: load, encoder and decoder, memory, power, temperature, clocks, fan and performance state. Set the item to the GPU name.",
  network: "Download and upload rates, with a graph.",
  interface:
    "One network interface: rates, Wi-Fi details and a graph. Set the item to the interface name.",
  desktop: "Whether the session is locked, and how long it's been idle.",
  processes: "The number of processes, with a graph.",
  commands: "Buttons to lock, log out, sleep, hibernate, restart or shut down.",
  power: "The power profile, and a switch to keep the device awake.",
  system: "Device power usage and whether the camera is in use.",
};

const HELPERS = new Map([
  ["device_id", "The System Bridge device to show."],
  ["page", "The web client page this view shows."],
  [
    "item",
    "For sections about one thing: its mount point, GPU, display or interface name.",
  ],
  ["hours_to_show", "Hours that graphs go back."],
  ["tile_feature", "Shown under percentages such as CPU and memory usage."],
  ["show_icon_and_title", "Show the icon next to the title in the tab."],
  ["show_top_links", "Show a link to the System Bridge web client at the top."],
  ["pages", "In tab order. Drag to reorder, remove to hide."],
  ["icon_and_title_pages", "Pages whose tab shows the icon next to the title."],
  ["top_links_pages", "Pages with a link to the web client at the top."],
  [
    "media_features",
    "Controls on the Media tile, in order. Drag to reorder, remove to hide.",
  ],
  [
    "audio_features",
    "Controls on the Audio and output tiles, in order. Drag to reorder, remove to hide.",
  ],
  ["show_input_source", "Choose the default audio input."],
]);

interface SelectOption {
  value: string;
  label: string;
}

/** The sections about one disk, GPU, display or interface, and what they list. */
// Sections that draw a history graph, and sections with percentage tiles
const HISTORY_SECTIONS = new Set<string>([
  "overview-load",
  "overview-power",
  "overview-temperatures",
  "cpu-history",
  "memory-history",
  "disk-activity",
  "gpu",
  "network",
  "interface",
  "desktop",
  "processes",
]);

const PERCENTAGE_SECTIONS = new Set<string>([
  "battery",
  "device-batteries",
  "cpu",
  "memory",
  "mount",
  "gpu",
]);

const ITEM_KINDS = new Map<string, ItemKind>([
  ["mount", "mount"],
  ["gpu", "gpu"],
  ["display", "display"],
  ["interface", "interface"],
]);

type MediaOption = "media_features" | "audio_features" | "show_input_source";

const MEDIA_OPTIONS: readonly MediaOption[] = [
  "media_features",
  "audio_features",
  "show_input_source",
];

/** The media and audio options each section has. */
const SECTION_MEDIA_OPTIONS = new Map<string, readonly MediaOption[]>([
  ["audio", ["audio_features"]],
  ["now-playing", ["media_features"]],
  ["audio-outputs", ["audio_features"]],
  ["audio-inputs", ["show_input_source"]],
]);

/** The media and audio options each page has, from its sections. */
const PAGE_MEDIA_OPTIONS = new Map<string, readonly MediaOption[]>([
  ["overview", ["media_features", "audio_features"]],
  ["media", ["media_features"]],
  ["audio", ["audio_features", "show_input_source"]],
]);

/** The expandables the media and audio options go in. */
const MEDIA_GROUPS: readonly {
  name: string;
  options: readonly MediaOption[];
}[] = [
  { name: "media_options", options: ["media_features"] },
  { name: "audio_options", options: ["audio_features", "show_input_source"] },
];

const mediaOptions = (config: StrategyConfig): readonly MediaOption[] => {
  if ("section" in config) {
    return SECTION_MEDIA_OPTIONS.get(config.section) ?? [];
  }

  if ("page" in config) {
    return PAGE_MEDIA_OPTIONS.get(config.page) ?? [];
  }

  return MEDIA_OPTIONS;
};

/** Whether a section with the option is in Home Assistant's release. */
const isMediaOptionReleased = (
  option: MediaOption,
  version: string | undefined,
) =>
  [...SECTION_MEDIA_OPTIONS].some(
    ([section, options]) =>
      options.includes(option) &&
      isReleased(version, SECTION_RELEASES.get(section)),
  );

const mediaSchema = (config: StrategyConfig, version: string | undefined) => {
  const available = mediaOptions(config).filter((option) =>
    isMediaOptionReleased(option, version),
  );

  return MEDIA_GROUPS.flatMap(({ name, options }) => {
    const shown = options.filter((option) => available.includes(option));

    return shown.length > 0
      ? [
          {
            name,
            type: "expandable",
            flatten: true,
            // A section has nothing else to edit, so its options start open
            expanded: "section" in config,
            schema: shown.map((option) => ({
              name: option,
              selector: mediaOptionSelector(option),
            })),
          },
        ]
      : [];
  });
};

const mediaOptionSelector = (name: MediaOption) => {
  switch (name) {
    case "media_features":
      return featuresSelector(MEDIA_FEATURES);
    case "audio_features":
      return featuresSelector(AUDIO_FEATURES);
    case "show_input_source":
      return { boolean: {} };
  }
};

const sameList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

/** The options every strategy has, then those of the strategy the config is for. */
const generalSchema = (
  config: StrategyConfig,
  itemOptions: readonly SelectOption[],
  version: string | undefined,
) => [
  {
    name: "device_id",
    selector: { device: { integration: "system_bridge" } },
  },
  ...("page" in config
    ? [
        {
          name: "page",
          required: true,
          selector: {
            select: {
              mode: "dropdown",
              // The saved page stays, so the dropdown still shows it
              options: PAGES.filter(
                ({ page }) =>
                  page === config.page ||
                  isReleased(version, PAGE_RELEASES.get(page)),
              ).map(({ page, title }) => ({
                value: page,
                label: title,
              })),
            },
          },
        },
      ]
    : []),
  ...("page" in config
    ? [
        {
          name: "links_and_titles",
          type: "grid",
          flatten: true,
          column_min_width: "200px",
          schema: [
            { name: "show_icon_and_title", selector: { boolean: {} } },
            { name: "show_top_links", selector: { boolean: {} } },
          ],
        },
      ]
    : []),
  ...("section" in config
    ? [
        {
          name: "section",
          required: true,
          selector: {
            select: {
              mode: "box",
              box_max_columns: 2,
              sort: true,
              options: Object.entries(SECTION_DESCRIPTIONS).flatMap(
                ([value, description]) =>
                  isSectionName(value) &&
                  (value === config.section ||
                    isReleased(version, SECTION_RELEASES.get(value)))
                    ? [
                        {
                          value,
                          label: sectionLabel(value),
                          description,
                          image: {
                            src: sectionImage(value, false),
                            src_dark: sectionImage(value, true),
                          },
                        },
                      ]
                    : [],
              ),
            },
          },
        },
        ...(ITEM_KINDS.has(config.section)
          ? [
              {
                name: "item",
                required: true,
                selector: {
                  select: {
                    mode: "dropdown",
                    sort: true,
                    options: itemOptions,
                  },
                },
              },
            ]
          : []),
      ]
    : []),
  ...(!("section" in config) || HISTORY_SECTIONS.has(config.section)
    ? [
        {
          name: "hours_to_show",
          selector: {
            number: {
              min: 1,
              max: 48,
              mode: "slider",
              slider_ticks: true,
              unit_of_measurement: "h",
            },
          },
        },
      ]
    : []),
  ...(!("section" in config) || PERCENTAGE_SECTIONS.has(config.section)
    ? [
        {
          name: "tile_feature",
          selector: {
            select: {
              mode: "box",
              box_max_columns: 3,
              options: TILE_FEATURES.map((value) => ({
                value,
                label: TILE_FEATURE_LABELS.get(value) ?? value,
                description: TILE_FEATURE_DESCRIPTIONS.get(value),
                image: {
                  src: tileFeatureImage(value, false),
                  src_dark: tileFeatureImage(value, true),
                },
              })),
            },
          },
        },
      ]
    : []),
  ...mediaSchema(config, version),
];

const isDashboardConfig = (
  config: StrategyConfig,
): config is DashboardStrategyConfig =>
  !("page" in config) && !("section" in config);

@customElement("system-bridge-strategy-editor")
export class SystemBridgeStrategyEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: StrategyConfig;

  @state() private _entities?: SystemBridgeEntities;

  private _entitiesFor?: string;

  public setConfig(config: StrategyConfig) {
    this._config = config;
  }

  protected willUpdate() {
    const hass = this.hass;
    const config = this._config;

    if (!hass || !config || !("section" in config)) {
      return;
    }

    // Looked up once for each device, since hass changes all the time
    const key = config.device_id ?? "";

    if (this._entitiesFor === key) {
      return;
    }

    this._entitiesFor = key;

    const result = resolveDevice(hass, config.device_id);

    if (!("device" in result)) {
      this._entities = undefined;

      return;
    }

    void getSystemBridgeEntities(hass, result.device).then((entities) => {
      if (this._entitiesFor === key) {
        this._entities = entities;
      }
    });
  }

  /** The device's mounts, GPUs, displays or interfaces, for the section. */
  private _itemOptions(config: StrategyConfig): SelectOption[] {
    if (!("section" in config)) {
      return [];
    }

    const kind = ITEM_KINDS.get(config.section);

    const options = kind
      ? [...(this._entities?.items[kind] ?? [])].map(([value, item]) => ({
          value,
          label: item.name,
        }))
      : [];

    // Keep a saved item that the device doesn't have, so it still shows
    if (config.item && !options.some(({ value }) => value === config.item)) {
      options.push({ value: config.item, label: config.item });
    }

    return options;
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }

    const config = this._config;
    const version = this.hass?.config.version;
    const hidden = hiddenPages(version);

    const shown = (list: readonly string[]) =>
      list.filter((page) => !hidden.has(page));

    const pages = isDashboardConfig(config)
      ? html`<ha-form
          .hass=${this.hass}
          .data=${{
            pages: shown(config.pages ?? ALL_PAGES),
            icon_and_title_pages: shown(
              config.icon_and_title_pages ?? ALL_PAGES,
            ),
            top_links_pages: shown(config.top_links_pages ?? ALL_PAGES),
          }}
          .schema=${pagesSchema(shown(ALL_PAGES))}
          .computeLabel=${this._computeLabel}
          .computeHelper=${this._computeHelper}
          @value-changed=${this._generalChanged}
        ></ha-form>`
      : nothing;

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${{ ...DEFAULTS, ...config }}
        .schema=${generalSchema(config, this._itemOptions(config), version)}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        @value-changed=${this._generalChanged}
      ></ha-form>
      ${pages}
    `;
  }

  private _computeLabel = (schema: { name: string }) =>
    LABELS.get(schema.name) ?? schema.name;

  private _computeHelper = (schema: { name: string }) =>
    HELPERS.get(schema.name);

  private _generalChanged = (ev: CustomEvent<{ value: StrategyConfig }>) => {
    ev.stopPropagation();

    if (!this._config) {
      return;
    }

    const config: StrategyConfig = { ...this._config, ...ev.detail.value };

    // Leave defaults out of the saved config, as the built-in editors do
    if (config.hours_to_show === DEFAULT_HOURS_TO_SHOW) {
      delete config.hours_to_show;
    }

    if (config.tile_feature === DEFAULT_TILE_FEATURE) {
      delete config.tile_feature;
    }

    if ("show_icon_and_title" in config && config.show_icon_and_title) {
      delete config.show_icon_and_title;
    }

    if ("show_top_links" in config && config.show_top_links) {
      delete config.show_top_links;
    }

    if (
      config.media_features &&
      sameList(config.media_features, DEFAULT_MEDIA_FEATURES)
    ) {
      delete config.media_features;
    }

    if (
      config.audio_features &&
      sameList(config.audio_features, DEFAULT_AUDIO_FEATURES)
    ) {
      delete config.audio_features;
    }

    if (config.show_input_source) {
      delete config.show_input_source;
    }

    if (isDashboardConfig(config)) {
      // Hidden pages keep where they were, as the editor can't change them
      const previous = isDashboardConfig(this._config)
        ? this._config
        : undefined;

      const hidden = hiddenPages(this.hass?.config.version);

      for (const key of [
        "pages",
        "icon_and_title_pages",
        "top_links_pages",
      ] as const) {
        const list = config[key];

        if (list) {
          config[key] = withHiddenPages(
            list,
            previous?.[key] ?? ALL_PAGES,
            hidden,
          );
        }
      }

      // Only the page lists that differ from every page, in order, are saved
      if (config.pages && sameList(config.pages, ALL_PAGES)) {
        delete config.pages;
      }

      const sameSet = (list: string[] | undefined) =>
        list && sameList([...list].sort(), [...ALL_PAGES].sort());

      if (sameSet(config.icon_and_title_pages)) {
        delete config.icon_and_title_pages;
      }

      if (sameSet(config.top_links_pages)) {
        delete config.top_links_pages;
      }
    }

    this._emit(config);
  };

  private _emit(config: StrategyConfig) {
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config },
        bubbles: true,
        composed: true,
      }),
    );
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "system-bridge-strategy-editor": SystemBridgeStrategyEditor;
  }
}
