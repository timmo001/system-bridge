import { z } from "zod";

export const SettingsAPISchema = z.object({
  token: z.string(),
  port: z.number(),
});

export type SettingsAPI = z.infer<typeof SettingsAPISchema>;

export const SettingsHotkeySchema = z.object({
  name: z.string(),
  key: z.string(),
});

export type SettingsHotkey = z.infer<typeof SettingsHotkeySchema>;

export const SettingsMediaDirectorySchema = z.object({
  name: z.string(),
  path: z.string(),
});

export type SettingsMediaDirectory = z.infer<
  typeof SettingsMediaDirectorySchema
>;

export const SettingsMediaSchema = z.object({
  directories: z.array(SettingsMediaDirectorySchema),
});

export type SettingsMedia = z.infer<typeof SettingsMediaSchema>;

export const SettingsCommandSchema = z.object({
  name: z.string(),
  description: z.string(),
  command: z.string(),
  args: z.array(z.string()),
  enabled: z.boolean(),
});

export type SettingsCommand = z.infer<typeof SettingsCommandSchema>;

export const SettingsCommandsSchema = z.object({
  commands: z.array(SettingsCommandSchema),
});

export type SettingsCommands = z.infer<typeof SettingsCommandsSchema>;

export const SettingsSchema = z.object({
  api: SettingsAPISchema,
  autostart: z.boolean(),
  commands: SettingsCommandsSchema,
  hotkeys: z.array(SettingsHotkeySchema),
  logLevel: z.enum(["debug", "info", "warn", "error"]),
  media: SettingsMediaSchema,
});

export type Settings = z.infer<typeof SettingsSchema>;
