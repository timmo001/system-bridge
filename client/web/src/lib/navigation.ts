import {
  mdiApplicationCogOutline,
  mdiBattery,
  mdiBellOutline,
  mdiChartLine,
  mdiCogOutline,
  mdiConsoleLine,
  mdiCpu64Bit,
  mdiExpansionCardVariant,
  mdiFolderMultipleOutline,
  mdiHarddisk,
  mdiHeadset,
  mdiInformationOutline,
  mdiLan,
  mdiLanConnect,
  mdiMemory,
  mdiMonitor,
  mdiOpenInNew,
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
    description: "Host, platform, uptime and users",
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
    description: "Partitions, space and activity",
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
    description: "What's playing now",
    icon: mdiPlayCircleOutline,
  },
  discord: {
    label: "Discord",
    description: "Voice, calls and notifications",
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
 * Each module's page. The navigation has one entry for them all; the page's
 * own tabs switch between them, and the quick jump lists each one.
 */
export const moduleItems: readonly NavItem[] = moduleOrder.map((module) => ({
  id: `module-${module}`,
  label: moduleInfo[module].label,
  icon: moduleInfo[module].icon,
  href: href("module", { params: { module } }),
  matches: (location) =>
    location.name === "module" && location.params.module === module,
}));

export const navigation: readonly NavSection[] = [
  {
    label: "",
    items: [
      routeItem("overview", "Overview", mdiViewDashboardOutline),
      {
        id: "data",
        label: "Data",
        icon: mdiChartLine,
        href: href("module", { params: { module: "system" } }),
        matches: (location) => location.name === "module",
      },
    ],
  },
  {
    label: "Actions",
    items: [
      routeItem("media", "Media controls", mdiPlayCircleOutline),
      routeItem("notifications", "Notifications", mdiBellOutline),
      routeItem("open", "Open", mdiOpenInNew),
    ],
  },
  {
    label: "Settings",
    items: [
      routeItem("settings", "General", mdiCogOutline),
      routeItem("settingsAppearance", "Appearance", mdiPaletteOutline),
      routeItem("settingsCommands", "Commands", mdiConsoleLine),
      routeItem("settingsMedia", "Media directories", mdiFolderMultipleOutline),
      routeItem("settingsDisks", "Disk mounts", mdiHarddisk),
      routeItem("connection", "Connection", mdiLanConnect),
    ],
  },
];

/** The title for the browser tab, such as "CPU | System Bridge". */
export const documentTitle = (page: string): string =>
  page === "" ? "System Bridge" : `${page} | System Bridge`;

export const isModuleName = Schema.is(ModuleName);
