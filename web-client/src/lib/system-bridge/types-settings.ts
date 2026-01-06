import { Schema } from "effect";

export const SettingsHotkeySchema = Schema.Struct({
  name: Schema.String,
  key: Schema.String,
});

export type SettingsHotkey = typeof SettingsHotkeySchema.Type;

export const SettingsMediaDirectorySchema = Schema.Struct({
  name: Schema.String.pipe(Schema.nonEmptyString()),
  path: Schema.String.pipe(Schema.nonEmptyString()),
});

export type SettingsMediaDirectory = typeof SettingsMediaDirectorySchema.Type;

export const SettingsMediaSchema = Schema.Struct({
  directories: Schema.Array(SettingsMediaDirectorySchema),
});

export type SettingsMedia = typeof SettingsMediaSchema.Type;

export const SettingsCommandDefinitionSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String.pipe(Schema.nonEmptyString()),
  command: Schema.String.pipe(Schema.nonEmptyString()),
  workingDir: Schema.String,
  arguments: Schema.Array(Schema.String),
});

export type SettingsCommandDefinition =
  typeof SettingsCommandDefinitionSchema.Type;

export const SettingsCommandsSchema = Schema.Struct({
  allowlist: Schema.Array(SettingsCommandDefinitionSchema),
});

export type SettingsCommands = typeof SettingsCommandsSchema.Type;

export const SettingsSchema = Schema.Struct({
  autostart: Schema.Boolean,
  hotkeys: Schema.Array(SettingsHotkeySchema),
  logLevel: Schema.Union(
    Schema.Literal("DEBUG"),
    Schema.Literal("INFO"),
    Schema.Literal("WARN"),
    Schema.Literal("ERROR"),
  ),
  commands: SettingsCommandsSchema,
  media: SettingsMediaSchema,
});

export type Settings = typeof SettingsSchema.Type;
