import { Schema } from "effect";
import { ModuleName } from "./generated/modules.js";

export const EventType = Schema.Literals([
  "EXIT_APPLICATION",
  "GET_DATA",
  "GET_DIRECTORIES",
  "GET_DIRECTORY",
  "GET_DISCORD_SETUP",
  "GET_DISK_MOUNTS",
  "GET_FILES",
  "GET_FILE",
  "GET_HISTORY",
  "GET_SETTINGS",
  "KEYBOARD_KEYPRESS",
  "KEYBOARD_TEXT",
  "DISCORD_CONTROL",
  "MEDIA_CONTROL",
  "NOTIFICATION",
  "OPEN",
  "POWER_HIBERNATE",
  "POWER_LOCK",
  "POWER_LOGOUT",
  "POWER_RESTART",
  "POWER_SHUTDOWN",
  "POWER_SLEEP",
  "REGISTER_DATA_LISTENER",
  "UNREGISTER_DATA_LISTENER",
  "DATA_UPDATE",
  "COMMAND_EXECUTE",
  "UPDATE_DISCORD_SETUP",
  "UPDATE_SETTINGS",
  "VALIDATE_DIRECTORY",
]);

export type EventType = typeof EventType.Type;

export const ResponseType = Schema.Literals([
  "ERROR",
  "APPLICATION_EXITING",
  "DATA_GET",
  "DIRECTORIES",
  "DIRECTORY",
  "DISK_MOUNTS",
  "DISCORD_CONTROLLED",
  "DISCORD_SETUP",
  "DISCORD_SETUP_UPDATED",
  "FILES",
  "FILE",
  "HISTORY",
  "KEYBOARD_KEY_PRESSED",
  "KEYBOARD_TEXT_SENT",
  "MEDIA_CONTROLLED",
  "NOTIFICATION_SENT",
  "OPENED",
  "POWER_HIBERNATING",
  "POWER_LOCKING",
  "POWER_LOGGINGOUT",
  "POWER_RESTARTING",
  "POWER_SHUTTINGDOWN",
  "POWER_SLEEPING",
  "DATA_LISTENER_REGISTERED",
  "DATA_LISTENER_UNREGISTERED",
  "DATA_UPDATE",
  "COMMAND_EXECUTING",
  "COMMAND_COMPLETED",
  "SETTINGS_RESULT",
  "SETTINGS_UPDATED",
  "DIRECTORY_VALIDATED",
]);

export type ResponseType = typeof ResponseType.Type;

export const ResponseSubtype = Schema.Literals([
  "NONE",
  "BAD_REQUEST",
  "BAD_TOKEN",
  "BAD_JSON",
  "BAD_DIRECTORY",
  "BAD_FILE",
  "BAD_PATH",
  "INVALID_ACTION",
  "LISTENER_ALREADY_REGISTERED",
  "LISTENER_NOT_REGISTERED",
  "MISSING_ACTION",
  "MISSING_BASE",
  "MISSING_KEY",
  "MISSING_MODULES",
  "MISSING_PATH",
  "MISSING_PATH_URL",
  "MISSING_SETTING",
  "MISSING_TEXT",
  "MISSING_TITLE",
  "MISSING_TOKEN",
  "MISSING_VALUE",
  "COMMAND_NOT_FOUND",
  "UNKNOWN_EVENT",
]);

export type ResponseSubtype = typeof ResponseSubtype.Type;

/**
 * A message from the backend. `type` and `subtype` stay plain strings because
 * the backend also sends values outside the declared lists.
 */
export const WebSocketResponse = Schema.Struct({
  id: Schema.optionalKey(Schema.String),
  type: Schema.String,
  subtype: Schema.optionalKey(Schema.String),
  data: Schema.optionalKey(Schema.Unknown),
  message: Schema.optionalKey(Schema.String),
  module: Schema.optionalKey(Schema.String),
});

export interface WebSocketResponse extends Schema.Schema.Type<
  typeof WebSocketResponse
> {}

export const LogLevel = Schema.Literals(["DEBUG", "INFO", "WARN", "ERROR"]);

export type LogLevel = typeof LogLevel.Type;

export const SettingsHotkey = Schema.Struct({
  name: Schema.String,
  key: Schema.String,
});

export interface SettingsHotkey extends Schema.Schema.Type<
  typeof SettingsHotkey
> {}

export const SettingsCommandDefinition = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  command: Schema.String,
  workingDir: Schema.String,
  arguments: Schema.Array(Schema.String),
});

export interface SettingsCommandDefinition extends Schema.Schema.Type<
  typeof SettingsCommandDefinition
> {}

export const SettingsCommands = Schema.Struct({
  allowlist: Schema.Array(SettingsCommandDefinition),
});

export interface SettingsCommands extends Schema.Schema.Type<
  typeof SettingsCommands
> {}

export const SettingsMediaDirectory = Schema.Struct({
  name: Schema.String,
  path: Schema.String,
});

export interface SettingsMediaDirectory extends Schema.Schema.Type<
  typeof SettingsMediaDirectory
> {}

export const SettingsMedia = Schema.Struct({
  directories: Schema.Array(SettingsMediaDirectory),
});

export interface SettingsMedia extends Schema.Schema.Type<
  typeof SettingsMedia
> {}

export const SettingsDisks = Schema.Struct({
  allowedSecondaryMountPoints: Schema.Array(Schema.String),
});

export interface SettingsDisks extends Schema.Schema.Type<
  typeof SettingsDisks
> {}

export const Settings = Schema.Struct({
  autostart: Schema.Boolean,
  systemTray: Schema.Boolean,
  hotkeys: Schema.Array(SettingsHotkey),
  logLevel: LogLevel,
  commands: SettingsCommands,
  disks: SettingsDisks,
  media: SettingsMedia,
});

export interface Settings extends Schema.Schema.Type<typeof Settings> {}

export const MediaDirectory = Schema.Struct({
  key: Schema.String,
  path: Schema.String,
});

export interface MediaDirectory extends Schema.Schema.Type<
  typeof MediaDirectory
> {}

export const Directory = Schema.Struct({
  key: Schema.String,
  name: Schema.String,
  path: Schema.String,
  description: Schema.optionalKey(Schema.String),
});

export interface Directory extends Schema.Schema.Type<typeof Directory> {}

export const FileInfo = Schema.Struct({
  name: Schema.String,
  path: Schema.String,
  size: Schema.Finite,
  isDirectory: Schema.Boolean,
  modTime: Schema.String,
  permissions: Schema.String,
  contentType: Schema.optionalKey(Schema.String),
  extension: Schema.optionalKey(Schema.String),
});

export interface FileInfo extends Schema.Schema.Type<typeof FileInfo> {}

export const ValidateDirectoryResult = Schema.Struct({
  valid: Schema.Boolean,
});

export const CommandResult = Schema.Struct({
  commandID: Schema.String,
  exitCode: Schema.Int,
  stdout: Schema.String,
  stderr: Schema.String,
  error: Schema.optionalKey(Schema.String),
});

export interface CommandResult extends Schema.Schema.Type<
  typeof CommandResult
> {}

export const Notification = Schema.Struct({
  title: Schema.String,
  message: Schema.String,
  icon: Schema.optionalKey(Schema.String),
  /** Milliseconds. */
  duration: Schema.optionalKey(Schema.Int),
  actionUrl: Schema.optionalKey(Schema.String),
  actionPath: Schema.optionalKey(Schema.String),
  sound: Schema.optionalKey(Schema.String),
});

export interface Notification extends Schema.Schema.Type<typeof Notification> {}

export const KeyboardKeypress = Schema.Struct({
  key: Schema.String,
  modifiers: Schema.Array(Schema.String),
  /** Milliseconds. */
  delay: Schema.Int,
});

export interface KeyboardKeypress extends Schema.Schema.Type<
  typeof KeyboardKeypress
> {}

export const KeyboardText = Schema.Struct({
  text: Schema.String,
  /** Milliseconds. */
  delay: Schema.Int,
});

export interface KeyboardText extends Schema.Schema.Type<typeof KeyboardText> {}

export const MediaAction = Schema.Literals([
  "PLAY",
  "PAUSE",
  "STOP",
  "PREVIOUS",
  "NEXT",
  "VOLUME_UP",
  "VOLUME_DOWN",
  "MUTE",
]);

export type MediaAction = typeof MediaAction.Type;

export const MediaControl = Schema.Struct({ action: MediaAction });

export const DiscordAction = Schema.Literals([
  "JOIN_VOICE_CHANNEL",
  "LEAVE_VOICE_CHANNEL",
  "OPEN_TEXT_CHANNEL",
  "MUTE",
  "UNMUTE",
  "TOGGLE_MUTE",
  "DEAFEN",
  "UNDEAFEN",
  "TOGGLE_DEAFEN",
  "SET_INPUT_VOLUME",
  "SET_INPUT_DEVICE",
  "SET_OUTPUT_VOLUME",
  "SET_OUTPUT_DEVICE",
  "SET_VOICE_MODE",
  "SET_VOICE_THRESHOLD",
  "SET_PUSH_TO_TALK_DELAY",
  "ENABLE_QOS",
  "DISABLE_QOS",
  "TOGGLE_QOS",
  "ENABLE_SILENCE_WARNING",
  "DISABLE_SILENCE_WARNING",
  "TOGGLE_SILENCE_WARNING",
  "MUTE_USER",
  "UNMUTE_USER",
  "TOGGLE_USER_MUTE",
  "SET_USER_VOLUME",
  "TOGGLE_VIDEO",
  "TOGGLE_SCREENSHARE",
  "PLAY_SOUND",
]);

export type DiscordAction = typeof DiscordAction.Type;

/** The `mode` for `SET_VOICE_MODE`. */
export const DiscordVoiceModeType = Schema.Literals([
  "VOICE_ACTIVITY",
  "PUSH_TO_TALK",
]);

export type DiscordVoiceModeType = typeof DiscordVoiceModeType.Type;

export const DiscordControl = Schema.Struct({
  action: DiscordAction,
  channel_id: Schema.optionalKey(Schema.String),
  user_id: Schema.optionalKey(Schema.String),
  sound_id: Schema.optionalKey(Schema.String),
  value: Schema.optionalKey(Schema.NullOr(Schema.Finite)),
  device_id: Schema.optionalKey(Schema.String),
  mode: Schema.optionalKey(DiscordVoiceModeType),
});

export interface DiscordControl extends Schema.Schema.Type<
  typeof DiscordControl
> {}

/**
 * How far Discord is set up. The backend never sends the client secret back.
 */
export const DiscordSetup = Schema.Struct({
  /** Valid credentials are saved. */
  configured: Schema.Boolean,
  clientId: Schema.String,
  /** Must be registered as a redirect on the Discord application. */
  redirectUri: Schema.String,
  /** The Discord desktop app can be reached. */
  running: Schema.Boolean,
  connected: Schema.Boolean,
  authenticated: Schema.Boolean,
  /** The latest problem with the credentials or the session, or empty. */
  error: Schema.String,
});

export interface DiscordSetup extends Schema.Schema.Type<typeof DiscordSetup> {}

export const DiscordSetupRequest = Schema.Struct({
  clientId: Schema.String,
  clientSecret: Schema.String,
});

export const OpenTarget = Schema.Union([
  Schema.Struct({ path: Schema.String }),
  Schema.Struct({ url: Schema.String }),
]);

export type OpenTarget = typeof OpenTarget.Type;

export const ModulesRequest = Schema.Struct({
  modules: Schema.Array(ModuleName),
});

/**
 * `since` is in Unix milliseconds, and `modules` limits the history to those
 * modules' readings. Without them, the whole history is sent.
 */
export const HistoryRequest = Schema.Struct({
  since: Schema.optionalKey(Schema.Int),
  modules: Schema.optionalKey(Schema.Array(ModuleName)),
});

export interface HistoryRequest extends Schema.Schema.Type<
  typeof HistoryRequest
> {}

export const DirectoryRequest = Schema.Struct({ base: Schema.String });

export const PathRequest = Schema.Struct({ path: Schema.String });

export const CommandRequest = Schema.Struct({ commandID: Schema.String });

export const GetFilesRequest = Schema.Struct({
  base: Schema.String,
  path: Schema.optionalKey(Schema.String),
});

export interface GetFilesRequest extends Schema.Schema.Type<
  typeof GetFilesRequest
> {}

export const Health = Schema.Struct({
  status: Schema.String,
  timestamp: Schema.String,
  version: Schema.String,
});

export interface Health extends Schema.Schema.Type<typeof Health> {}

export const ErrorBody = Schema.Struct({ error: Schema.String });

export const Empty = Schema.Struct({});
