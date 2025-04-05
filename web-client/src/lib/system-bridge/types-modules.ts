import { z } from "zod";

export const ModuleNameSchema = z.enum([
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
]);

export type ModuleName = z.infer<typeof ModuleNameSchema>;
