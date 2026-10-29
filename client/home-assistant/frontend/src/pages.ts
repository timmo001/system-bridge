import type { ItemKind, SystemBridgeEntities } from "./registry";
import type { SectionName } from "./sections";

export interface SectionRef {
  section: SectionName;
  item?: string;
}

export interface Page {
  /** The web client's path for the page, which is also the view's path. */
  page: string;
  title: string;
  /** The web client's icon for the page, from `client/web/src/lib/navigation.ts`. */
  icon: string;
  /** Whether the view shows the device's version, OS and update badges. */
  diagnostics?: boolean;
  sections: (entities: SystemBridgeEntities) => SectionRef[];
}

const each = (
  entities: SystemBridgeEntities,
  kind: ItemKind,
  section: SectionName,
): SectionRef[] =>
  [...entities.items[kind].keys()].map((item) => ({ section, item }));

/**
 * The web client's pages, Overview first and then in its navigation order.
 * Pages for modules Core has no entities for yet are commented out below,
 * ready to come back as Core adds them. Gate each new entity in release.ts's
 * RELEASE_GATES at the Core release that ships it.
 */
export const PAGES: readonly Page[] = [
  {
    page: "overview",
    title: "Overview",
    icon: "mdi:view-dashboard-outline",
    diagnostics: true,
    sections: () => [
      { section: "storage" },
      { section: "now-playing" },
      { section: "overview-load" },
      { section: "network" },
      { section: "overview-power" },
      { section: "overview-temperatures" },
    ],
  },
  // Per-app volume is not for Core: apps come and go too often for entities
  {
    page: "audio",
    title: "Audio",
    icon: "mdi:volume-high",
    sections: () => [{ section: "audio-outputs" }, { section: "audio-inputs" }],
  },
  {
    page: "battery",
    title: "Battery",
    icon: "mdi:battery",
    sections: () => [{ section: "battery" }, { section: "device-batteries" }],
  },
  // TODO(Core): uncomment if Core adds a connected binary sensor per paired
  // device (Core roadmap note, low priority). Device control is not for Core.
  // {
  //   page: "bluetooth",
  //   title: "Bluetooth",
  //   icon: "mdi:bluetooth",
  //   sections: (entities) => each(entities, "bluetooth", "bluetooth-device"),
  // },
  {
    page: "cpu",
    title: "CPU",
    icon: "mdi:cpu-64-bit",
    sections: () => [
      { section: "cpu" },
      { section: "cpu-history" },
      { section: "cpu-cores" },
    ],
  },
  // Windows, workspaces and the keyboard layout are not for Core
  {
    page: "desktop",
    title: "Desktop",
    icon: "mdi:application-outline",
    sections: () => [{ section: "desktop" }],
  },
  // Discord has no page: its controls are not for Core.
  {
    page: "disks",
    title: "Disks",
    icon: "mdi:harddisk",
    sections: (entities) => [
      ...each(entities, "mount", "mount"),
      { section: "disk-activity" },
    ],
  },
  {
    page: "displays",
    title: "Displays",
    icon: "mdi:monitor",
    sections: (entities) => each(entities, "display", "display"),
  },
  {
    page: "gpus",
    title: "GPUs",
    icon: "mdi:expansion-card-variant",
    sections: (entities) => each(entities, "gpu", "gpu"),
  },
  {
    page: "media",
    title: "Media",
    icon: "mdi:play-circle-outline",
    sections: () => [{ section: "now-playing" }],
  },
  {
    page: "memory",
    title: "Memory",
    icon: "mdi:memory",
    sections: () => [{ section: "memory" }, { section: "memory-history" }],
  },
  {
    page: "networks",
    title: "Networks",
    icon: "mdi:lan",
    sections: (entities) => [
      { section: "network" },
      ...each(entities, "interface", "interface"),
    ],
  },
  {
    page: "processes",
    title: "Processes",
    icon: "mdi:application-cog-outline",
    sections: () => [{ section: "processes" }],
  },
  // TODO(Core): uncomment with the sensors module in Core (Core roadmap note,
  // "Core features"): a section per sensor chip, temperatures then fans.
  // {
  //   page: "sensors",
  //   title: "Sensors",
  //   icon: "mdi:thermometer",
  //   sections: (entities) => each(entities, "sensor_chip", "sensor-chip"),
  // },
  {
    page: "system",
    title: "System",
    icon: "mdi:information-outline",
    diagnostics: true,
    sections: () => [{ section: "system" }, { section: "commands" }],
  },
];
