import type { ItemKind, SystemBridgeEntities } from "./registry";
import { isSectionName, type SectionName } from "./sections";
import type { SectionStrategyConfig } from "./types";

/** One Home Assistant section, made of one or more of a module's sections. */
export interface SectionRef {
  sections: SectionName[];
  item?: string;
  /** The page the section's heading opens, when that page is in the dashboard. */
  link?: string;
}

/** A web client module, which is also a dashboard page. */
export interface Page {
  /** The web client's path for the page, which is also the view's path. */
  page: string;
  title: string;
  /** What it shows, after the web client's module descriptions in `client/web/src/lib/navigation.ts`. */
  description: string;
  /** The web client's icon for the page, from `client/web/src/lib/navigation.ts`. */
  icon: string;
  /** Whether the view shows the device's version, OS and update badges. */
  diagnostics?: boolean;
  /** The sections the section editor offers for the module, in page order. */
  sections: readonly SectionName[];
  /** The view's Home Assistant sections, each from sections in `sections`. */
  layout: (entities: SystemBridgeEntities) => SectionRef[];
}

const each = (
  entities: SystemBridgeEntities,
  kind: ItemKind,
  section: SectionName,
): SectionRef[] =>
  [...entities.items[kind].keys()].map((item) => ({
    sections: [section],
    item,
  }));

/** One Home Assistant section for each of the module's sections, in order. */
const oneEach = (sections: readonly SectionName[]) => (): SectionRef[] =>
  sections.map((section) => ({ sections: [section] }));

/**
 * The web client's pages, Overview first and then in its navigation order.
 * Pages for modules Core has no entities for yet are commented out below,
 * ready to come back as Core adds them. Gate each new entity in release.ts's
 * RELEASE_GATES at the Core release that ships it, and the section or page in
 * SECTION_RELEASES or PAGE_RELEASES when all of its entities are gated.
 */
export const PAGES: readonly Page[] = [
  {
    page: "overview",
    title: "Overview",
    description: "A summary of storage, audio, media, load, network and power",
    icon: "mdi:view-dashboard-outline",
    diagnostics: true,
    sections: [
      "storage",
      "audio",
      "now-playing",
      "overview-load",
      "network",
      "overview-power",
      "overview-temperatures",
    ],
    layout: () => [
      { sections: ["storage"], link: "disks" },
      { sections: ["audio"], link: "audio" },
      { sections: ["now-playing"], link: "media" },
      { sections: ["overview-load"], link: "cpu" },
      { sections: ["network"], link: "networks" },
      { sections: ["overview-power"], link: "system" },
      { sections: ["overview-temperatures"], link: "cpu" },
    ],
  },
  // Per-app volume is not for Core: apps come and go too often for entities
  {
    page: "audio",
    title: "Audio",
    description: "Output and input devices and their volume",
    icon: "mdi:volume-high",
    sections: ["audio-outputs", "audio-inputs"],
    layout: oneEach(["audio-outputs", "audio-inputs"]),
  },
  {
    page: "battery",
    title: "Battery",
    description: "Charge and time remaining, and connected devices' batteries",
    icon: "mdi:battery",
    sections: ["battery", "device-batteries"],
    layout: oneEach(["battery", "device-batteries"]),
  },
  // TODO(Core): uncomment if Core adds a connected binary sensor per paired
  // device (Core roadmap note, low priority). Device control is not for Core.
  // {
  //   page: "bluetooth",
  //   title: "Bluetooth",
  //   description: "Paired devices and whether they're connected",
  //   icon: "mdi:bluetooth",
  //   sections: ["bluetooth-device"],
  //   layout: (entities) => each(entities, "bluetooth", "bluetooth-device"),
  // },
  {
    page: "cpu",
    title: "CPU",
    description: "Usage, frequency and each core",
    icon: "mdi:cpu-64-bit",
    sections: ["cpu", "cpu-history", "cpu-cores"],
    layout: oneEach(["cpu", "cpu-history", "cpu-cores"]),
  },
  // Windows, workspaces and the keyboard layout are not for Core
  {
    page: "desktop",
    title: "Desktop",
    description: "Whether the session is locked, and how long it's been idle",
    icon: "mdi:application-outline",
    sections: ["desktop"],
    layout: oneEach(["desktop"]),
  },
  // Discord has no page: its controls are not for Core.
  {
    page: "disks",
    title: "Disks",
    description: "Space on each mount, and disk activity",
    icon: "mdi:harddisk",
    sections: ["mount", "disk-activity"],
    layout: (entities) => [
      ...each(entities, "mount", "mount"),
      { sections: ["disk-activity"] },
    ],
  },
  {
    page: "displays",
    title: "Displays",
    description: "Power, brightness, resolution and refresh rate",
    icon: "mdi:monitor",
    sections: ["display"],
    layout: (entities) => each(entities, "display", "display"),
  },
  {
    page: "gpus",
    title: "GPUs",
    description: "Load, memory, clocks and power",
    icon: "mdi:expansion-card-variant",
    sections: ["gpu"],
    layout: (entities) => each(entities, "gpu", "gpu"),
  },
  {
    page: "media",
    title: "Media",
    description: "What's playing and its controls",
    icon: "mdi:play-circle-outline",
    sections: ["now-playing"],
    layout: oneEach(["now-playing"]),
  },
  {
    page: "memory",
    title: "Memory",
    description: "Physical memory and swap",
    icon: "mdi:memory",
    sections: ["memory", "memory-history"],
    layout: oneEach(["memory", "memory-history"]),
  },
  {
    page: "networks",
    title: "Networks",
    description: "Interfaces and traffic",
    icon: "mdi:lan",
    sections: ["network-activity", "interface"],
    layout: (entities) => [
      { sections: ["network-activity"] },
      ...each(entities, "interface", "interface"),
    ],
  },
  {
    page: "processes",
    title: "Processes",
    description: "How many processes are running",
    icon: "mdi:application-cog-outline",
    sections: ["processes"],
    layout: oneEach(["processes"]),
  },
  // TODO(Core): uncomment with the sensors module in Core (Core roadmap note,
  // "Core features"): a section per sensor chip, temperatures then fans.
  // {
  //   page: "sensors",
  //   title: "Sensors",
  //   description: "Temperatures and fans",
  //   icon: "mdi:thermometer",
  //   sections: ["sensor-chip"],
  //   layout: (entities) => each(entities, "sensor_chip", "sensor-chip"),
  // },
  {
    page: "system",
    title: "System",
    description: "The device, power, commands and notifications",
    icon: "mdi:information-outline",
    diagnostics: true,
    sections: [
      "system",
      "power",
      "power-commands",
      "saved-commands",
      "notifications",
    ],
    layout: () => [
      { sections: ["system"] },
      { sections: ["power"] },
      { sections: ["power-commands", "saved-commands"] },
      { sections: ["notifications"] },
    ],
  },
];

/**
 * What a section added from the section picker starts as: a small System
 * section, so the picker's preview has something to show. The editor opens
 * one that's still just this on the modules, to pick what it should be.
 */
export const STUB_SECTION = { module: "system", sections: ["system"] } as const;

/** Whether a section's config is still the one the section picker added. */
export const isStubSection = ({
  type: _type,
  device_id: _deviceId,
  ...rest
}: SectionStrategyConfig) =>
  Object.keys(rest).length === 2 &&
  rest.module === STUB_SECTION.module &&
  rest.sections?.length === 1 &&
  rest.sections[0] === STUB_SECTION.sections[0];

export const findPage = (page: string | undefined) =>
  PAGES.find((candidate) => candidate.page === page);

/** The module a section is in first, for configs from before modules. */
export const moduleOf = (section: string) =>
  PAGES.find(({ sections }) =>
    sections.some((candidate) => candidate === section),
  );

/** Section names in their module's order, whatever order they were chosen in. */
export const inModuleOrder = (
  module: string | undefined,
  names: readonly SectionName[],
) => {
  const order = findPage(module)?.sections;

  return order
    ? [...names].sort((a, b) => order.indexOf(a) - order.indexOf(b))
    : [...names];
};

/** Sections from before modules that are now split into several. */
const SPLIT_SECTIONS = new Map<string, SectionName[]>([
  ["commands", ["power-commands", "saved-commands"]],
]);

/**
 * The section names a config asks for, in its module's order, and any it
 * names that don't exist. Configs from before modules have one `section`,
 * which still works.
 */
export const configSections = (config: SectionStrategyConfig) => {
  const names =
    config.sections ??
    (config.section === undefined
      ? []
      : (SPLIT_SECTIONS.get(config.section) ?? [config.section]));

  return {
    sections: inModuleOrder(config.module, names.filter(isSectionName)),
    unknown: names.filter((name) => !isSectionName(name)),
  };
};

/** The config's module, or the one its first section is in for older configs. */
export const configModule = (config: SectionStrategyConfig) =>
  findPage(config.module) ?? moduleOf(configSections(config).sections[0] ?? "");
