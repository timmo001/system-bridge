import { z } from "zod";

export const SettingsHotkeySchema = z.object({
  name: z.string(),
  key: z.string(),
});

export type SettingsHotkey = z.infer<typeof SettingsHotkeySchema>;

export const SettingsMediaDirectorySchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
});

export type SettingsMediaDirectory = z.infer<
  typeof SettingsMediaDirectorySchema
>;

export const SettingsMediaSchema = z.object({
  directories: z.array(SettingsMediaDirectorySchema),
});

export type SettingsMedia = z.infer<typeof SettingsMediaSchema>;

export const SettingsCommandDefinitionSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  command: z.string().min(1),
  workingDir: z.string(),
  arguments: z.array(z.string()),
});

export type SettingsCommandDefinition = z.infer<
  typeof SettingsCommandDefinitionSchema
>;

export const SettingsCommandsSchema = z.object({
  allowlist: z.array(SettingsCommandDefinitionSchema),
});

export type SettingsCommands = z.infer<typeof SettingsCommandsSchema>;

export const SettingsSchema = z.object({
  autostart: z.boolean(),
  hotkeys: z.array(SettingsHotkeySchema),
  logLevel: z.enum(["DEBUG", "INFO", "WARN", "ERROR"]),
  commands: SettingsCommandsSchema,
  media: SettingsMediaSchema,
});

export type Settings = z.infer<typeof SettingsSchema>;
