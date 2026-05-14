import { z } from "zod";

const SettingsHotkeySchema = z.object({
  name: z.string(),
  key: z.string(),
});

const SettingsMediaDirectorySchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
});

const SettingsMediaSchema = z.object({
  directories: z.array(SettingsMediaDirectorySchema),
});

const SettingsDisksSchema = z.object({
  allowedSecondaryMountPoints: z.array(z.string()),
});

const SettingsCommandDefinitionSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  command: z.string().min(1),
  workingDir: z.string(),
  arguments: z.array(z.string()),
});

export type SettingsCommandDefinition = z.infer<
  typeof SettingsCommandDefinitionSchema
>;

const SettingsCommandsSchema = z.object({
  allowlist: z.array(SettingsCommandDefinitionSchema),
});

const SettingsSchema = z.object({
  autostart: z.boolean(),
  hotkeys: z.array(SettingsHotkeySchema),
  logLevel: z.enum(["DEBUG", "INFO", "WARN", "ERROR"]),
  commands: SettingsCommandsSchema,
  disks: SettingsDisksSchema,
  media: SettingsMediaSchema,
});

export type Settings = z.infer<typeof SettingsSchema>;
