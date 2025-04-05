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

export const ModuleDataSchema = z.record(ModuleNameSchema, z.any());

export type ModuleData = z.infer<typeof ModuleDataSchema>;

export const DefaultModuleData: ModuleData = Modules.reduce((acc, module) => {
  acc[module] = {};
  return acc;
}, {} as ModuleData);
