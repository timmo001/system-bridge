import {
  mdiApplicationCogOutline,
  mdiApplicationOutline,
  mdiBattery,
  mdiBluetooth,
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
  mdiVolumeHigh,
  mdiWebcam,
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
  audio: {
    label: "Audio",
    description: "Output and input devices, their volume and the defaults",
    icon: mdiVolumeHigh,
  },
  battery: {
    label: "Battery",
    description: "Charge and time remaining",
    icon: mdiBattery,
  },
  bluetooth: {
    label: "Bluetooth",
    description: "Paired devices and whether they're connected",
    icon: mdiBluetooth,
  },
  cameras: {
    label: "Cameras",
    description: "Webcams and their settings",
    icon: mdiWebcam,
  },
  cpu: {
    label: "CPU",
    description: "Usage, frequency and each core",
    icon: mdiCpu64Bit,
  },
  desktop: {
    label: "Desktop",
    description: "Windows, workspaces and the keyboard layout",
    icon: mdiApplicationOutline,
  },
  discord: {
    label: "Discord",
    description: "Voice controls, calls and setup",
    icon: mdiHeadset,
  },
  disks: {
    label: "Disks",
    description: "Partitions, space and activity, and which mounts to show",
    icon: mdiHarddisk,
  },
  displays: {
    label: "Displays",
    description: "Resolution, position and refresh rate",
    icon: mdiMonitor,
  },
  gpus: {
    label: "GPUs",
    description: "Load, memory, clocks and power",
    icon: mdiExpansionCardVariant,
  },
  media: {
    label: "Media",
    description: "What's playing, its controls and your media directories",
    icon: mdiPlayCircleOutline,
  },
  memory: {
    label: "Memory",
    description: "Physical memory and swap",
    icon: mdiMemory,
  },
  networks: {
    label: "Networks",
    description: "Interfaces, traffic and connections",
    icon: mdiLan,
  },
  processes: {
    label: "Processes",
    description: "Running processes and their usage",
    icon: mdiApplicationCogOutline,
  },
  sensors: {
    label: "Sensors",
    description: "Temperatures and fans",
    icon: mdiThermometer,
  },
  system: {
    label: "System",
    description:
      "Host, platform and uptime, with commands, notifications and opening",
    icon: mdiInformationOutline,
  },
};

/** Modules in the order the navigation lists them, by label. */
export const moduleOrder: readonly ModuleName[] = [...ModuleName.literals].sort(
  (a, b) => moduleInfo[a].label.localeCompare(moduleInfo[b].label),
);

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

/** The pages, then the settings. */
export const navigation: readonly NavSection[] = [
  {
    label: "",
    items: [
      routeItem("overview", "Overview", mdiViewDashboardOutline),
      ...moduleOrder.map(moduleItem),
    ],
  },
  {
    label: "Settings",
    items: [
      routeItem("settings", "General", mdiCogOutline),
      routeItem("settingsAppearance", "Appearance", mdiPaletteOutline),
    ],
  },
  {
    label: "Connection",
    items: [routeItem("connection", "Connection", mdiLanConnect)],
  },
];

/** The title for the browser tab, such as "CPU | System Bridge". */
export const documentTitle = (page: string): string =>
  page === "" ? "System Bridge" : `${page} | System Bridge`;

export const isModuleName = Schema.is(ModuleName);
