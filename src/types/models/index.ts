import {
  mdiBattery,
  mdiCpu64Bit,
  mdiHarddisk,
  mdiMonitor,
  mdiExpansionCard,
  mdiVideoVintage,
  mdiMemory,
  mdiNetworkOutline,
  mdiWindowMaximize,
  mdiChip,
  mdiDesktopTower,
} from "@mdi/js";

import { Battery } from "./battery";
import { CPU } from "./cpu";
import { Disks } from "./disks";
import { Displays } from "./displays";
import { GPUs } from "./gpus";
import { Media } from "./media";
import { Memory } from "./memory";
import { Networks } from "./networks";
import { Processes } from "./processes";
import { Sensors } from "./sensors";
import { System } from "./system";

export enum Module {
  Battery = "battery",
  CPU = "cpu",
  Disks = "disks",
  Displays = "displays",
  GPUs = "gpus",
  Media = "media",
  Memory = "memory",
  Networks = "networks",
  Processes = "processes",
  Sensors = "sensors",
  System = "system",
}

export const modules: Array<Module> = Object.values(Module);

export const moduleMap: { [key: string]: { name: string; icon: string } } = {
  battery: { name: "Battery", icon: mdiBattery },
  cpu: { name: "CPU", icon: mdiCpu64Bit },
  disks: { name: "Disks", icon: mdiHarddisk },
  displays: { name: "Displays", icon: mdiMonitor },
  gpus: { name: "GPUs", icon: mdiExpansionCard },
  media: { name: "Media", icon: mdiVideoVintage },
  memory: { name: "Memory", icon: mdiMemory },
  networks: { name: "Networks", icon: mdiNetworkOutline },
  processes: { name: "Processes", icon: mdiWindowMaximize },
  sensors: { name: "Sensors", icon: mdiChip },
  system: { name: "System", icon: mdiDesktopTower },
};

export type Modules = Battery & CPU & Disks & Displays & GPUs & Media & Memory & Networks & Processes & Sensors & System;

export interface ModuleData {
  battery?: Battery;
  cpu?: CPU;
  disks?: Disks;
  displays?: Displays;
  gpus?: GPUs;
  media?: Media;
  memory?: Memory;
  networks?: Networks;
  processes?: Processes;
  sensors?: Sensors;
  system?: System;
}
