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
import { isSectionName, type SectionName } from "./sections";
import { sectionImage } from "./section-images";
import {
  type DashboardStrategyConfig,
  type HomeAssistant,
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
]);

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
};

const ALL_PAGES = PAGES.map(({ page }) => page);

const pagesSelector = (reorder: boolean) => ({
  select: {
    multiple: true,
    reorder,
    mode: "dropdown",
    options: PAGES.map(({ page, title }) => ({ value: page, label: title })),
  },
});

const PAGES_SCHEMA = [
  {
    name: "pages_options",
    type: "expandable",
    flatten: true,
    expanded: true,
    schema: [
      { name: "pages", selector: pagesSelector(true) },
      { name: "icon_and_title_pages", selector: pagesSelector(false) },
      { name: "top_links_pages", selector: pagesSelector(false) },
    ],
  },
];

/** Defaults of the page lists, which are every page, and left out of the saved config. */
const PAGES_DEFAULTS = {
  pages: ALL_PAGES,
  icon_and_title_pages: ALL_PAGES,
  top_links_pages: ALL_PAGES,
};

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
  "now-playing": "The media playing, with playback and volume controls.",
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

const sameList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

/** The options every strategy has, then those of the strategy the config is for. */
const generalSchema = (
  config: StrategyConfig,
  itemOptions: readonly SelectOption[],
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
              options: PAGES.map(({ page, title }) => ({
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
                  isSectionName(value)
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

    const pages = isDashboardConfig(config)
      ? html`<ha-form
          .hass=${this.hass}
          .data=${{ ...PAGES_DEFAULTS, ...config }}
          .schema=${PAGES_SCHEMA}
          .computeLabel=${this._computeLabel}
          .computeHelper=${this._computeHelper}
          @value-changed=${this._generalChanged}
        ></ha-form>`
      : nothing;

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${{ ...DEFAULTS, ...config }}
        .schema=${generalSchema(config, this._itemOptions(config))}
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

    if (isDashboardConfig(config)) {
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
