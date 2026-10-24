import {
  mdiApplicationCogOutline,
  mdiBattery,
  mdiCogOutline,
  mdiCpu64Bit,
  mdiExpansionCardVariant,
  mdiHarddisk,
  mdiHeadset,
  mdiInformationOutline,
  mdiLan,
  mdiLanConnect,
  mdiMemory,
  mdiMonitor,
  mdiPaletteOutline,
  mdiPlayCircleOutline,
  mdiThermometer,
  mdiViewDashboardOutline,
} from "@mdi/js";
import { ModuleName } from "@timmo001/effect-system-bridge";
import { Schema } from "effect";

import { href, type Location, type RouteName } from "./router";

export interface ModuleInfo {
  readonly label: string;
  readonly description: string;
  readonly icon: string;
}

export const moduleInfo: Readonly<Record<ModuleName, ModuleInfo>> = {
  system: {
    label: "System",
    description:
      "Host, platform and uptime, with commands, notifications and opening",
    icon: mdiInformationOutline,
  },
  cpu: {
    label: "CPU",
    description: "Usage, frequency and each core",
    icon: mdiCpu64Bit,
  },
  memory: {
    label: "Memory",
    description: "Physical memory and swap",
    icon: mdiMemory,
  },
  disks: {
    label: "Disks",
    description: "Partitions, space and activity, and which mounts to show",
    icon: mdiHarddisk,
  },
  networks: {
    label: "Networks",
    description: "Interfaces, traffic and connections",
    icon: mdiLan,
  },
  gpus: {
    label: "GPUs",
    description: "Load, memory, clocks and power",
    icon: mdiExpansionCardVariant,
  },
  sensors: {
    label: "Sensors",
    description: "Temperatures and fans",
    icon: mdiThermometer,
  },
  battery: {
    label: "Battery",
    description: "Charge and time remaining",
    icon: mdiBattery,
  },
  displays: {
    label: "Displays",
    description: "Resolution, position and refresh rate",
    icon: mdiMonitor,
  },
  processes: {
    label: "Processes",
    description: "Running processes and their usage",
    icon: mdiApplicationCogOutline,
  },
  media: {
    label: "Media",
    description: "What's playing, its controls and your media directories",
    icon: mdiPlayCircleOutline,
  },
  discord: {
    label: "Discord",
    description: "Voice controls, calls and setup",
    icon: mdiHeadset,
  },
};

/** Modules in the order the navigation lists them. */
export const moduleOrder: readonly ModuleName[] = [
  "system",
  "cpu",
  "memory",
  "disks",
  "networks",
  "gpus",
  "sensors",
  "battery",
  "displays",
  "processes",
  "media",
  "discord",
];

export interface NavItem {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly href: string;
  /** Whether the item is the current page, or a parent of it. */
  readonly matches: (location: Location) => boolean;
}

export interface NavSection {
  readonly label: string;
  readonly items: readonly NavItem[];
}

const routeItem = (
  name: Exclude<RouteName, "module">,
  label: string,
  icon: string,
): NavItem => ({
  id: name,
  label,
  icon,
  href: href(name),
  matches: (location) => location.name === name,
});

/**
 * A module's page, which holds its data along with the controls and settings
 * that go with it.
 */
const moduleItem = (module: ModuleName): NavItem => ({
  id: `module-${module}`,
  label: moduleInfo[module].label,
  icon: moduleInfo[module].icon,
  href: href("module", { params: { module } }),
  matches: (location) =>
    location.name === "module" && location.params.module === module,
});

/** The pages, grouped into areas. */
export const navigation: readonly NavSection[] = [
  {
    label: "",
    items: [routeItem("overview", "Overview", mdiViewDashboardOutline)],
  },
  {
    label: "System",
    items: (["system", "processes"] as const).map(moduleItem),
  },
  {
    label: "Hardware",
    items: (
      ["cpu", "memory", "gpus", "sensors", "battery", "displays"] as const
    ).map(moduleItem),
  },
  {
    label: "Storage and network",
    items: (["disks", "networks"] as const).map(moduleItem),
  },
  {
    label: "Apps",
    items: (["media", "discord"] as const).map(moduleItem),
  },
  {
    label: "Settings",
    items: [
      routeItem("settings", "General", mdiCogOutline),
      routeItem("settingsAppearance", "Appearance", mdiPaletteOutline),
      routeItem("connection", "Connection", mdiLanConnect),
    ],
  },
];

/** The title for the browser tab, such as "CPU | System Bridge". */
export const documentTitle = (page: string): string =>
  page === "" ? "System Bridge" : `${page} | System Bridge`;

export const isModuleName = Schema.is(ModuleName);
