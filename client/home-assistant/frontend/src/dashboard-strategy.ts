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

    return {
      views: PAGES.filter(
        (page) => pageSections(page, entities, config).length > 0,
      ).map((page) => pageView(page, entities, config)),
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
