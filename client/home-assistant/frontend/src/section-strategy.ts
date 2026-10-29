import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators.js";
import {
  DEFAULT_HOURS_TO_SHOW,
  DEFAULT_TILE_FEATURE,
  percentageFeatures,
} from "./cards";
import "./editor";
import type { SectionRef } from "./pages";
import {
  type DeviceResult,
  findDevices,
  getSystemBridgeEntities,
  resolveDevice,
  type SystemBridgeEntities,
} from "./registry";
import { isAtLeast, MINIMUM_RELEASE } from "./release";
import { isSectionName, SECTIONS } from "./sections";
import {
  DEFAULT_AUDIO_FEATURES,
  DEFAULT_MEDIA_FEATURES,
  type HomeAssistant,
  type LovelaceSectionConfig,
  type SectionOptions,
  type SectionStrategyConfig,
  STRATEGY_TYPE,
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
  options: SectionOptions,
) =>
  SECTIONS[section]({
    entities,
    item,
    hours: options.hours_to_show ?? DEFAULT_HOURS_TO_SHOW,
    percentage: percentageFeatures(
      options.tile_feature ?? DEFAULT_TILE_FEATURE,
    ),
    mediaFeatures: options.media_features ?? DEFAULT_MEDIA_FEATURES,
    audioFeatures: options.audio_features ?? DEFAULT_AUDIO_FEATURES,
    inputSource: options.show_input_source ?? true,
  });

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
        config,
      ) ?? message("No System Bridge entities for this section.")
    );
  }

  static getConfigElement() {
    return document.createElement("system-bridge-strategy-editor");
  }

  // The new section and its preview when it's added from the section picker,
  // on the device with the most entities, as a leftover device may have none
  static getStubConfig(hass: HomeAssistant): SectionStrategyConfig | undefined {
    if (!isAtLeast(hass.config.version, MINIMUM_RELEASE)) {
      return undefined;
    }

    const counts = new Map<string, number>();

    for (const entry of Object.values(hass.entities)) {
      if (entry?.device_id) {
        counts.set(entry.device_id, (counts.get(entry.device_id) ?? 0) + 1);
      }
    }

    const [device] = findDevices(hass).sort(
      (a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0),
    );

    return device
      ? { type: STRATEGY_TYPE, device_id: device.id, section: "overview-load" }
      : undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ll-strategy-section-system-bridge": SystemBridgeSectionStrategy;
  }
}
