import { Schema } from "effect";

// Auto-generated file. Do not edit manually.
// Generated from backend types in types/module.go

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

export const ModuleNameSchema = Schema.Union(
  Schema.Literal("battery"),
  Schema.Literal("cpu"),
  Schema.Literal("disks"),
  Schema.Literal("displays"),
  Schema.Literal("gpus"),
  Schema.Literal("media"),
  Schema.Literal("memory"),
  Schema.Literal("networks"),
  Schema.Literal("processes"),
  Schema.Literal("sensors"),
  Schema.Literal("system"),
);

export type ModuleName = typeof ModuleNameSchema.Type;

// Use a simple record type for ModuleData since we need mutability for the default
export type ModuleData = Record<ModuleName, unknown>;

export const DefaultModuleData: ModuleData = {
  battery: {},
  cpu: {},
  disks: {},
  displays: {},
  gpus: {},
  media: {},
  memory: {},
  networks: {},
  processes: {},
  sensors: {},
  system: {},
};
