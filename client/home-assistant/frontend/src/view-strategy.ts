import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators.js";
import {
  DEFAULT_HOURS_TO_SHOW,
  diagnosticBadges,
  webClientBadge,
} from "./cards";
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
  type SectionStrategyConfig,
  STRATEGY_TYPE,
  type ViewStrategyConfig,
} from "./types";

/** The page's sections that have entities, as section strategies. */
export const pageSections = (
  page: Page,
  entities: SystemBridgeEntities,
  config: { device_id?: string; hours_to_show?: number },
): LovelaceStrategySectionConfig[] =>
  page
    .sections(entities)
    .filter(
      (ref) =>
        buildSection(
          entities,
          ref,
          config.hours_to_show ?? DEFAULT_HOURS_TO_SHOW,
        ) !== undefined,
    )
    .map((ref) => {
      const strategy: SectionStrategyConfig = {
        type: STRATEGY_TYPE,
        device_id: entities.device.id,
        ...ref,
      };

      if (config.hours_to_show) {
        strategy.hours_to_show = config.hours_to_show;
      }

      return { strategy };
    });

export const pageView = (
  page: Page,
  entities: SystemBridgeEntities,
  config: { device_id?: string; hours_to_show?: number },
): LovelaceViewConfig => ({
  type: "sections",
  title: page.title,
  path: page.page,
  icon: page.icon,
  max_columns: 3,
  badges: [
    ...webClientBadge(entities, page.page, page.title),
    ...(page.diagnostics ? diagnosticBadges(entities) : []),
  ],
  sections: pageSections(page, entities, config),
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
