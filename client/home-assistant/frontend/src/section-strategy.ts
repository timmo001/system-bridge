import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators.js";
import { DEFAULT_HOURS_TO_SHOW } from "./cards";
import "./editor";
import type { SectionRef } from "./pages";
import {
  type DeviceResult,
  getSystemBridgeEntities,
  resolveDevice,
  type SystemBridgeEntities,
} from "./registry";
import { MINIMUM_RELEASE } from "./release";
import { isSectionName, SECTIONS } from "./sections";
import type {
  HomeAssistant,
  LovelaceSectionConfig,
  SectionStrategyConfig,
} from "./types";

export const REGISTRY_DEPENDENCIES = ["entities", "devices"] as const;

const DEVICE_ERRORS: Record<
  Extract<DeviceResult, { error: string }>["error"],
  string
> = {
  release: `The System Bridge dashboard needs Home Assistant ${MINIMUM_RELEASE} or later.`,
  none: "No System Bridge devices found. Add the System Bridge integration first.",
  several:
    "There are several System Bridge devices. Choose one in the settings.",
  not_found:
    "The System Bridge device was not found. Choose another in the settings.",
};

export const deviceError = (result: Extract<DeviceResult, { error: string }>) =>
  DEVICE_ERRORS[result.error];

export const buildSection = (
  entities: SystemBridgeEntities,
  { section, item }: SectionRef,
  hours: number,
) => SECTIONS[section]({ entities, item, hours });

const message = (content: string): LovelaceSectionConfig => ({
  type: "grid",
  cards: [{ type: "markdown", content }],
});

@customElement("ll-strategy-section-system-bridge")
export class SystemBridgeSectionStrategy extends ReactiveElement {
  // Cards show live states, so only a new or removed entity changes the layout
  static registryDependencies = REGISTRY_DEPENDENCIES;

  static async generate(
    config: SectionStrategyConfig,
    hass: HomeAssistant,
  ): Promise<LovelaceSectionConfig> {
    if (!isSectionName(config.section)) {
      return message(`Unknown System Bridge section "${config.section}".`);
    }

    const result = resolveDevice(hass, config.device_id);

    if ("error" in result) {
      return message(deviceError(result));
    }

    const entities = await getSystemBridgeEntities(hass, result.device);

    return (
      buildSection(
        entities,
        { section: config.section, item: config.item },
        config.hours_to_show ?? DEFAULT_HOURS_TO_SHOW,
      ) ?? message("No System Bridge entities for this section.")
    );
  }

  static getConfigElement() {
    return document.createElement("system-bridge-strategy-editor");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ll-strategy-section-system-bridge": SystemBridgeSectionStrategy;
  }
}
