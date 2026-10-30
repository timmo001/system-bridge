import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators.js";
import "./editor";
import { PAGES } from "./pages";
import { getSystemBridgeEntities, resolveDevice } from "./registry";
import { deviceError, REGISTRY_DEPENDENCIES } from "./section-strategy";
import type {
  DashboardStrategyConfig,
  HomeAssistant,
  LovelaceDashboardConfig,
} from "./types";
import { pageSections, pageView } from "./view-strategy";

@customElement("ll-strategy-dashboard-system-bridge")
export class SystemBridgeDashboardStrategy extends ReactiveElement {
  static registryDependencies = REGISTRY_DEPENDENCIES;

  static async generate(
    config: DashboardStrategyConfig,
    hass: HomeAssistant,
  ): Promise<LovelaceDashboardConfig> {
    const result = resolveDevice(hass, config.device_id);

    if ("error" in result) {
      return {
        views: [
          {
            title: "System Bridge",
            cards: [{ type: "markdown", content: deviceError(result) }],
          },
        ],
      };
    }

    const entities = await getSystemBridgeEntities(hass, result.device);

    // The chosen pages, in the chosen order; unknown paths are skipped
    const pages = (config.pages ?? PAGES.map(({ page }) => page))
      .flatMap((path) => PAGES.filter(({ page }) => page === path))
      .filter((page) => pageSections(page, entities, config).length > 0);

    const views = new Set(pages.map(({ page }) => page));

    return {
      views: pages.map((page) =>
        pageView(
          page,
          entities,
          {
            ...config,
            show_icon_and_title:
              config.icon_and_title_pages?.includes(page.page) ?? true,
            show_top_links: config.top_links_pages?.includes(page.page) ?? true,
          },
          views,
        ),
      ),
    };
  }

  static getCreateSuggestions() {
    return { title: "System Bridge", icon: "mdi:desktop-tower-monitor" };
  }

  static getConfigElement() {
    return document.createElement("system-bridge-strategy-editor");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ll-strategy-dashboard-system-bridge": SystemBridgeDashboardStrategy;
  }
}
