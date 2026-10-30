import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators.js";
import { diagnosticBadges, webClientBadge } from "./cards";
import "./editor";
import { type Page, PAGES } from "./pages";
import {
  getSystemBridgeEntities,
  resolveDevice,
  type SystemBridgeEntities,
} from "./registry";
import {
  buildSection,
  deviceError,
  REGISTRY_DEPENDENCIES,
} from "./section-strategy";
import {
  type HomeAssistant,
  type LovelaceStrategySectionConfig,
  type LovelaceViewConfig,
  type SectionOptions,
  type SectionStrategyConfig,
  STRATEGY_TYPE,
  type ViewStrategyConfig,
} from "./types";

/**
 * The page's sections that have entities, as section strategies. Headings
 * only link to `views`, the other views in the same dashboard.
 */
export const pageSections = (
  page: Page,
  entities: SystemBridgeEntities,
  options: SectionOptions,
  views: ReadonlySet<string> = new Set(),
): LovelaceStrategySectionConfig[] =>
  page
    .sections(entities)
    .filter((ref) => buildSection(entities, ref, options) !== undefined)
    .map(({ link, ...ref }) => {
      const strategy: SectionStrategyConfig = {
        type: STRATEGY_TYPE,
        device_id: entities.device.id,
        ...ref,
      };

      if (link !== undefined && views.has(link)) {
        strategy.link = link;
      }

      // Only options that were set, so the sections keep their defaults
      if (options.hours_to_show !== undefined) {
        strategy.hours_to_show = options.hours_to_show;
      }

      if (options.tile_feature !== undefined) {
        strategy.tile_feature = options.tile_feature;
      }

      if (options.media_features !== undefined) {
        strategy.media_features = options.media_features;
      }

      if (options.audio_features !== undefined) {
        strategy.audio_features = options.audio_features;
      }

      if (options.show_input_source !== undefined) {
        strategy.show_input_source = options.show_input_source;
      }

      return { strategy };
    });

export const pageView = (
  page: Page,
  entities: SystemBridgeEntities,
  options: SectionOptions & {
    show_icon_and_title?: boolean;
    show_top_links?: boolean;
  },
  views?: ReadonlySet<string>,
): LovelaceViewConfig => ({
  type: "sections",
  title: page.title,
  path: page.page,
  icon: page.icon,
  show_icon_and_title: options.show_icon_and_title ?? true,
  max_columns: 3,
  badges: [
    ...(options.show_top_links === false
      ? []
      : webClientBadge(entities, page.page, page.title)),
    ...(page.diagnostics ? diagnosticBadges(entities) : []),
  ],
  sections: pageSections(page, entities, options, views),
});

@customElement("ll-strategy-view-system-bridge")
export class SystemBridgeViewStrategy extends ReactiveElement {
  static registryDependencies = REGISTRY_DEPENDENCIES;

  static async generate(
    config: ViewStrategyConfig,
    hass: HomeAssistant,
  ): Promise<LovelaceViewConfig> {
    const page = PAGES.find(({ page }) => page === config.page);

    if (!page) {
      return {
        title: "System Bridge",
        cards: [
          {
            type: "markdown",
            content: `Unknown System Bridge page "${config.page}".`,
          },
        ],
      };
    }

    const result = resolveDevice(hass, config.device_id);

    if ("error" in result) {
      return {
        title: page.title,
        cards: [{ type: "markdown", content: deviceError(result) }],
      };
    }

    return pageView(
      page,
      await getSystemBridgeEntities(hass, result.device),
      config,
    );
  }

  static getConfigElement() {
    return document.createElement("system-bridge-strategy-editor");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ll-strategy-view-system-bridge": SystemBridgeViewStrategy;
  }
}
