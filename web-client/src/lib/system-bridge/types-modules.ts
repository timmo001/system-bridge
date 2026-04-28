import { z } from "zod";

export const Modules = [
  "battery",
  "cpu",
  "disks",
  "displays",
  "gpus",
  "media",
  "memory",
  "networks",
  "processes",
  "sensors",
  "system",
] as const;

export const ModuleNameSchema = z.enum(Modules);

export type ModuleName = z.infer<typeof ModuleNameSchema>;

const ModuleDataSchema = z.record(ModuleNameSchema, z.any());

export type ModuleData = z.infer<typeof ModuleDataSchema>;

export const ModuleLabels: Record<ModuleName, string> = {
  battery: "Battery",
  cpu: "CPU",
  disks: "Disks",
  displays: "Displays",
  gpus: "GPUs",
  media: "Media",
  memory: "Memory",
  networks: "Networks",
  processes: "Processes",
  sensors: "Sensors",
  system: "System",
};

export const DefaultModuleData: ModuleData = Modules.reduce((acc, module) => {
  acc[module] = {};
  return acc;
}, {} as ModuleData);
