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

export const SettingsSchema = z.object({
  autostart: z.boolean(),
  hotkeys: z.array(SettingsHotkeySchema),
  logLevel: z.enum(["debug", "info", "warn", "error"]),
  media: SettingsMediaSchema,
});

export type Settings = z.infer<typeof SettingsSchema>;
