import { Schema } from "effect";
import {
  DisplayPowerState,
  HyprlandDirection,
  HyprlandDispatcher,
  ModuleName,
  OmarchyAction,
} from "./generated/modules.js";

export const EventType = Schema.Literals([
  "AUDIO_CONTROL",
  "BLUETOOTH_CONNECT",
  "BLUETOOTH_DISCONNECT",
  "BLUETOOTH_FORGET",
  "BLUETOOTH_SET_POWER",
  "CLIPBOARD_GET_TEXT",
  "CLIPBOARD_SET_TEXT",
  "COMMAND_ADD",
  "COMMAND_EXECUTE",
  "COMMAND_REMOVE",
  "COMMAND_UPDATE",
  "DATA_UPDATE",
  "DESKTOP_CLOSE_WINDOW",
  "DESKTOP_FOCUS_WINDOW",
  "DESKTOP_FOCUS_WORKSPACE",
  "DESKTOP_SET_KEYBOARD_LAYOUT",
  "DESKTOP_SET_WINDOW_STATE",
  "DISCORD_CONTROL",
  "DISPLAY_CONTROL",
  "EXIT_APPLICATION",
  "GET_COMMAND_PREFABS",
  "GET_DATA",
  "GET_DIRECTORIES",
  "GET_DIRECTORY",
  "GET_DISCORD_SETUP",
  "GET_DISK_MOUNTS",
  "GET_FILE",
  "GET_FILES",
  "GET_HISTORY",
  "GET_SETTINGS",
  "HYPRLAND_DISPATCH",
  "HYPRLAND_DISPATCH_RAW",
  "HYPRLAND_EVAL",
  "HYPRLAND_EXEC",
  "HYPRLAND_GET_CURSOR_POSITION",
  "HYPRLAND_GET_LOG",
  "HYPRLAND_GET_OPTION",
  "HYPRLAND_KILL_WINDOW",
  "HYPRLAND_MOVE_CURSOR",
  "HYPRLAND_MOVE_WINDOW",
  "HYPRLAND_MOVE_WORKSPACE",
  "HYPRLAND_RELOAD_CONFIG",
  "HYPRLAND_RENAME_WORKSPACE",
  "HYPRLAND_RUN_GLOBAL_SHORTCUT",
  "HYPRLAND_SEND_EVENT",
  "HYPRLAND_SET_OPTION",
  "HYPRLAND_SET_SUBMAP",
  "HYPRLAND_SET_WINDOW",
  "KEYBOARD_KEYPRESS",
  "KEYBOARD_TEXT",
  "MEDIA_CONTROL",
  "NOTIFICATION",
  "NOTIFICATION_DISMISS",
  "OMARCHY_MENU",
  "OMARCHY_PANEL",
  "OPEN",
  "POWER_HIBERNATE",
  "POWER_LOCK",
  "POWER_LOGOUT",
  "POWER_RESTART",
  "POWER_SHUTDOWN",
  "POWER_SLEEP",
  "PROCESS_KILL",
  "REGISTER_DATA_LISTENER",
  "SYSTEM_SET_KEEP_AWAKE",
  "SYSTEM_SET_POWER_PROFILE",
  "UNREGISTER_DATA_LISTENER",
  "UPDATE_DISCORD_SETUP",
  "UPDATE_SETTINGS",
  "VALIDATE_DIRECTORY",
]);

export type EventType = typeof EventType.Type;

export const ResponseType = Schema.Literals([
  "APPLICATION_EXITING",
  "AUDIO_CONTROLLED",
  "BLUETOOTH_CONNECTED",
  "BLUETOOTH_DISCONNECTED",
  "BLUETOOTH_FORGOTTEN",
  "BLUETOOTH_POWER_SET",
  "CLIPBOARD_TEXT",
  "CLIPBOARD_TEXT_SET",
  "COMMAND_ADDED",
  "COMMAND_COMPLETED",
  "COMMAND_EXECUTING",
  "COMMAND_PREFABS",
  "COMMAND_REMOVED",
  "COMMAND_UPDATED",
  "DATA_GET",
  "DATA_LISTENER_REGISTERED",
  "DATA_LISTENER_UNREGISTERED",
  "DATA_UPDATE",
  "DESKTOP_KEYBOARD_LAYOUT_SET",
  "DESKTOP_WINDOW_CLOSED",
  "DESKTOP_WINDOW_FOCUSED",
  "DESKTOP_WINDOW_STATE_SET",
  "DESKTOP_WORKSPACE_FOCUSED",
  "DIRECTORIES",
  "DIRECTORY",
  "DIRECTORY_VALIDATED",
  "DISCORD_CONTROLLED",
  "DISCORD_SETUP",
  "DISCORD_SETUP_UPDATED",
  "DISK_MOUNTS",
  "DISPLAY_CONTROLLED",
  "ERROR",
  "FILE",
  "FILES",
  "HISTORY",
  "HYPRLAND_CONFIG_RELOADED",
  "HYPRLAND_CURSOR_MOVED",
  "HYPRLAND_CURSOR_POSITION",
  "HYPRLAND_DISPATCHED",
  "HYPRLAND_EVALUATED",
  "HYPRLAND_EVENT",
  "HYPRLAND_EVENT_SENT",
  "HYPRLAND_EXECUTED",
  "HYPRLAND_GLOBAL_SHORTCUT_RUN",
  "HYPRLAND_LOG",
  "HYPRLAND_OPTION",
  "HYPRLAND_OPTION_SET",
  "HYPRLAND_RAW_DISPATCHED",
  "HYPRLAND_SUBMAP_SET",
  "HYPRLAND_WINDOW_KILLED",
  "HYPRLAND_WINDOW_MOVED",
  "HYPRLAND_WINDOW_SET",
  "HYPRLAND_WORKSPACE_MOVED",
  "HYPRLAND_WORKSPACE_RENAMED",
  "KEYBOARD_KEY_PRESSED",
  "KEYBOARD_TEXT_SENT",
  "MEDIA_CONTROLLED",
  "NOTIFICATION_ACTION",
  "NOTIFICATION_CLOSED",
  "NOTIFICATION_DISMISSED",
  "NOTIFICATION_SENT",
  "OMARCHY_MENU_CHANGED",
  "OMARCHY_PANEL_CHANGED",
  "OPENED",
  "POWER_HIBERNATING",
  "POWER_LOCKING",
  "POWER_LOGGINGOUT",
  "POWER_RESTARTING",
  "POWER_SHUTTINGDOWN",
  "POWER_SLEEPING",
  "PROCESS_KILLED",
  "SETTINGS_CHANGED",
  "SETTINGS_RESULT",
  "SETTINGS_UPDATED",
  "SYSTEM_KEEP_AWAKE_SET",
  "SYSTEM_POWER_PROFILE_SET",
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
  /**
   * A prefab's ID, or empty for a custom command. With an empty `command`,
   * the backend runs the prefab's program for its platform.
   */
  prefab: Schema.String,
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

export const SettingsDesktop = Schema.Struct({
  /** Whether the desktop module reports window titles, off by default. */
  windowTitles: Schema.Boolean,
  /**
   * Whether to run commands, any dispatcher and Lua through Hyprland, off by
   * default.
   */
  hyprlandCode: Schema.Boolean,
});

export interface SettingsDesktop extends Schema.Schema.Type<
  typeof SettingsDesktop
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
  desktop: SettingsDesktop,
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

/** One file's details, from `GET_FILE`. */
export const FileDetails = Schema.Struct({
  name: Schema.String,
  path: Schema.String,
  size: Schema.Finite,
  /** Unix milliseconds. */
  modified: Schema.Finite,
  /** Without the leading dot. */
  extension: Schema.String,
  mime_type: Schema.String,
});

export interface FileDetails extends Schema.Schema.Type<typeof FileDetails> {}

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

/** A button on a notification. Pressing it sends a `NOTIFICATION_ACTION` event with its `id`. */
export const NotificationButton = Schema.Struct({
  /** Anything but `default`, which is clicking the notification itself. */
  id: Schema.String,
  label: Schema.String,
});

export interface NotificationButton extends Schema.Schema.Type<
  typeof NotificationButton
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
  /** Critical ones stay until dismissed. Linux only. */
  urgency: Schema.optionalKey(Schema.Literals(["low", "normal", "critical"])),
  /** Up to 3 buttons. Linux only. */
  buttons: Schema.optionalKey(Schema.Array(NotificationButton)),
});

export interface Notification extends Schema.Schema.Type<typeof Notification> {}

/** `NOTIFICATION_SENT`'s reply: what was sent, and its `id`. */
export const NotificationSent = Schema.Struct({
  /** For `NOTIFICATION_DISMISS` and matching its events. 0 where it can't be followed. */
  id: Schema.Int,
});

/** Closes a notification System Bridge sent. Linux only. */
export const NotificationDismissRequest = Schema.Struct({ id: Schema.Int });

export interface NotificationDismissRequest extends Schema.Schema.Type<
  typeof NotificationDismissRequest
> {}

/** A notification System Bridge sent was clicked, or closed. */
export const NotificationEvent = Schema.Struct({
  id: Schema.Int,
  /** The button's `id`, or `default` for the notification itself. Missing when it closed. */
  action: Schema.optionalKey(Schema.String),
  /** `expired`, `dismissed` or `closed`. Missing when it was clicked. */
  reason: Schema.optionalKey(Schema.String),
});

export interface NotificationEvent extends Schema.Schema.Type<
  typeof NotificationEvent
> {}

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

/** Text to put on the clipboard. Linux only. */
export const ClipboardTextRequest = Schema.Struct({ text: Schema.String });

export interface ClipboardTextRequest extends Schema.Schema.Type<
  typeof ClipboardTextRequest
> {}

export const MediaAction = Schema.Literals([
  "PLAY",
  "PAUSE",
  "STOP",
  "PREVIOUS",
  "NEXT",
  "VOLUME_UP",
  "VOLUME_DOWN",
  "MUTE",
  "SEEK",
  "SET_VOLUME",
  "SET_SHUFFLE",
  "SET_REPEAT",
]);

export type MediaAction = typeof MediaAction.Type;

/**
 * Controls a media player. SEEK needs `position`, SET_VOLUME `volume`,
 * SET_SHUFFLE `shuffle` and SET_REPEAT `repeat`. On Windows only the actions
 * up to MUTE work, and not with `player`.
 */
export const MediaControl = Schema.Struct({
  action: MediaAction,
  /** A player's `id` from the media module's `players`. Leave it out for the player the module reports. */
  player: Schema.optionalKey(Schema.String),
  /** Seconds from the start of the track. */
  position: Schema.optionalKey(Schema.Finite),
  /** 0 to 1. */
  volume: Schema.optionalKey(Schema.Finite),
  shuffle: Schema.optionalKey(Schema.Boolean),
  repeat: Schema.optionalKey(Schema.Literals(["NONE", "TRACK", "LIST"])),
});

export interface MediaControl extends Schema.Schema.Type<typeof MediaControl> {}

/** Switches the power profile. Linux with power-profiles-daemon only. */
export const PowerProfileRequest = Schema.Struct({
  /** One of the system module's `power_profiles`, such as `balanced`. */
  profile: Schema.String,
});

export interface PowerProfileRequest extends Schema.Schema.Type<
  typeof PowerProfileRequest
> {}

/** Keeps the system from idling, or lets it idle again. Linux only. */
export const KeepAwakeRequest = Schema.Struct({
  enabled: Schema.Boolean,
  /** Seconds until the system may idle again. Leave it out to keep it awake until told otherwise. */
  duration: Schema.optionalKey(Schema.Int),
});

export interface KeepAwakeRequest extends Schema.Schema.Type<
  typeof KeepAwakeRequest
> {}

/**
 * Sets an output's, input's or app's volume or mute state, makes an output or
 * input the default, or moves an app to another output.
 */
export const AudioControl = Schema.Struct({
  /** An `id` from the audio module's `outputs`, `inputs` or `apps`. */
  id: Schema.String,
  /** Percent, 0-100. */
  volume: Schema.optionalKey(Schema.Finite),
  muted: Schema.optionalKey(Schema.Boolean),
  /** Makes it the default output or input. */
  default: Schema.optionalKey(Schema.Boolean),
  /** An output's `id`, to move an app's sound to it. Linux only. */
  output: Schema.optionalKey(Schema.String),
});

export interface AudioControl extends Schema.Schema.Type<typeof AudioControl> {}

/** Names a paired device by its `address` from the bluetooth module. */
export const BluetoothDeviceRequest = Schema.Struct({ address: Schema.String });

export interface BluetoothDeviceRequest extends Schema.Schema.Type<
  typeof BluetoothDeviceRequest
> {}

/** Whether the Bluetooth adapter should be on. */
export const BluetoothPowerRequest = Schema.Struct({ powered: Schema.Boolean });

export interface BluetoothPowerRequest extends Schema.Schema.Type<
  typeof BluetoothPowerRequest
> {}

/** Names a window by its `id` from the desktop module. */
export const DesktopWindowRequest = Schema.Struct({ id: Schema.String });

export interface DesktopWindowRequest extends Schema.Schema.Type<
  typeof DesktopWindowRequest
> {}

/**
 * Makes a window fullscreen, maximised or minimised, or not. A state left out
 * stays as it is. Hyprland can't minimise, and Windows can't make a window
 * fullscreen.
 */
export const DesktopWindowStateRequest = Schema.Struct({
  /** The window's `id` from the desktop module. */
  id: Schema.String,
  fullscreen: Schema.optionalKey(Schema.Boolean),
  maximised: Schema.optionalKey(Schema.Boolean),
  minimised: Schema.optionalKey(Schema.Boolean),
});

export interface DesktopWindowStateRequest extends Schema.Schema.Type<
  typeof DesktopWindowStateRequest
> {}

/** Names a workspace by its `id` from the desktop module. */
export const DesktopWorkspaceRequest = Schema.Struct({ id: Schema.String });

export interface DesktopWorkspaceRequest extends Schema.Schema.Type<
  typeof DesktopWorkspaceRequest
> {}

/** A layout from the desktop module's `keyboard.layouts`. */
export const DesktopKeyboardLayoutRequest = Schema.Struct({
  layout: Schema.String,
});

export interface DesktopKeyboardLayoutRequest extends Schema.Schema.Type<
  typeof DesktopKeyboardLayoutRequest
> {}

/** Sets a display's brightness, its power state, or both. */
export const DisplayControl = Schema.Struct({
  /** The display's `id` from the displays module. */
  id: Schema.String,
  /** Percent. */
  brightness: Schema.optionalKey(Schema.Finite),
  power_state: Schema.optionalKey(DisplayPowerState),
});

export interface DisplayControl extends Schema.Schema.Type<
  typeof DisplayControl
> {}

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

/** Runs a dispatcher on the focused window, as its bind would. */
export const HyprlandDispatchRequest = Schema.Struct({
  dispatcher: HyprlandDispatcher,
  /** Needed by `move_focus` and `swap_window`. */
  direction: Schema.optionalKey(HyprlandDirection),
  /** A window's `id` from the desktop module, focused before the dispatcher runs. */
  id: Schema.optionalKey(Schema.String),
});

export interface HyprlandDispatchRequest extends Schema.Schema.Type<
  typeof HyprlandDispatchRequest
> {}

/** A global shortcut's `name` from the desktop module's `hyprland.global_shortcuts`. */
export const HyprlandGlobalShortcutRequest = Schema.Struct({
  name: Schema.String,
});

export interface HyprlandGlobalShortcutRequest extends Schema.Schema.Type<
  typeof HyprlandGlobalShortcutRequest
> {}

/** Moves a window to a workspace, leaving the focus where it is. */
export const HyprlandMoveWindowRequest = Schema.Struct({
  /** The window's `id` from the desktop module. */
  id: Schema.String,
  /** A workspace `id` from the desktop module, or the number of a new one. */
  workspace: Schema.String,
});

export interface HyprlandMoveWindowRequest extends Schema.Schema.Type<
  typeof HyprlandMoveWindowRequest
> {}

/**
 * Floats or tiles a window, pins or unpins it, and moves or resizes it. A
 * setting left out stays as it is.
 */
export const HyprlandSetWindowRequest = Schema.Struct({
  /** The window's `id` from the desktop module. */
  id: Schema.String,
  floating: Schema.optionalKey(Schema.Boolean),
  /** Shown on every workspace. Only floating windows can be pinned. */
  pinned: Schema.optionalKey(Schema.Boolean),
  /** The window's left edge in pixels across every display, set with `y`. */
  x: Schema.optionalKey(Schema.Int),
  /** The window's top edge in pixels across every display, set with `x`. */
  y: Schema.optionalKey(Schema.Int),
  /** In pixels, set with `height`. */
  width: Schema.optionalKey(Schema.Int),
  /** In pixels, set with `width`. */
  height: Schema.optionalKey(Schema.Int),
});

export interface HyprlandSetWindowRequest extends Schema.Schema.Type<
  typeof HyprlandSetWindowRequest
> {}

/** Moves a workspace to another display. */
export const HyprlandMoveWorkspaceRequest = Schema.Struct({
  /** The workspace's `id` from the desktop module. */
  id: Schema.String,
  /** A display's `id` from the displays module. */
  display: Schema.String,
});

export interface HyprlandMoveWorkspaceRequest extends Schema.Schema.Type<
  typeof HyprlandMoveWorkspaceRequest
> {}

/**
 * Sets any config option until the config reloads. Read its `type` first with
 * `hyprlandGetOption`.
 */
export const HyprlandOptionRequest = Schema.Struct({
  /** Such as `animations.enabled` or `general:layout`. */
  name: Schema.String,
  /**
   * By the option's `type`: a boolean, a whole number, any number, or text.
   * A `vec2` takes two numbers, as `"5 10"` or `[5, 10]`, and a `css` option up
   * to four whole numbers, such as `"5 10"`. A `gradient` takes colours and an
   * optional angle, as `hyprlandGetOption` reports them. The options in
   * `hyprland.options` only take a number of 0 or more.
   */
  value: Schema.Union([
    Schema.Boolean,
    Schema.Finite,
    Schema.String,
    Schema.Array(Schema.Finite),
  ]),
});

export interface HyprlandOptionRequest extends Schema.Schema.Type<
  typeof HyprlandOptionRequest
> {}

/** Any config option, such as `general.col.active_border` or `general:layout`. */
export const HyprlandOptionNameRequest = Schema.Struct({
  name: Schema.String,
});

export interface HyprlandOptionNameRequest extends Schema.Schema.Type<
  typeof HyprlandOptionNameRequest
> {}

/** Moves the pointer, in pixels across every display. */
export const HyprlandMoveCursorRequest = Schema.Struct({
  x: Schema.Int,
  y: Schema.Int,
});

export interface HyprlandMoveCursorRequest extends Schema.Schema.Type<
  typeof HyprlandMoveCursorRequest
> {}

/**
 * Sends a custom event, as a bind to the event dispatcher would. It comes back
 * through `hyprlandEvents`.
 */
export const HyprlandSendEventRequest = Schema.Struct({
  name: Schema.String,
});

export interface HyprlandSendEventRequest extends Schema.Schema.Type<
  typeof HyprlandSendEventRequest
> {}

/**
 * Runs a command through Hyprland, in its environment. Needs
 * `desktop.hyprlandCode` on in the settings.
 */
export const HyprlandExecRequest = Schema.Struct({
  command: Schema.String,
});

export interface HyprlandExecRequest extends Schema.Schema.Type<
  typeof HyprlandExecRequest
> {}

/**
 * Runs any dispatch, written as the running config takes it: Lua such as
 * `hl.dsp.focus({ workspace = "2" })` when `hyprland.version.config_provider`
 * is `lua`, otherwise classic such as `workspace 2`. Needs
 * `desktop.hyprlandCode` on in the settings.
 */
export const HyprlandDispatchRawRequest = Schema.Struct({
  dispatch: Schema.String,
});

export interface HyprlandDispatchRawRequest extends Schema.Schema.Type<
  typeof HyprlandDispatchRawRequest
> {}

/**
 * Runs one line of Lua in Hyprland, with a Lua config. Hyprland only replies
 * whether it ran. Needs `desktop.hyprlandCode` on in the settings.
 */
export const HyprlandEvalRequest = Schema.Struct({
  code: Schema.String,
});

export interface HyprlandEvalRequest extends Schema.Schema.Type<
  typeof HyprlandEvalRequest
> {}

/** Renames a workspace, or gives it back its default name when `name` is left out. */
export const HyprlandRenameWorkspaceRequest = Schema.Struct({
  /** The workspace's `id` from the desktop module. */
  id: Schema.String,
  name: Schema.optionalKey(Schema.String),
});

export interface HyprlandRenameWorkspaceRequest extends Schema.Schema.Type<
  typeof HyprlandRenameWorkspaceRequest
> {}

/** Switches binds to a submap, or back to the default when `name` is left out. */
export const HyprlandSubmapRequest = Schema.Struct({
  /** A submap the desktop module's `hyprland.binds` are in. */
  name: Schema.optionalKey(Schema.String),
});

export interface HyprlandSubmapRequest extends Schema.Schema.Type<
  typeof HyprlandSubmapRequest
> {}

/**
 * Ends a process. It's asked to stop, or with `force` ended straight away,
 * losing anything unsaved.
 */
export const ProcessKillRequest = Schema.Struct({
  /** The process's `id` from the processes module. */
  id: Schema.Int,
  force: Schema.optionalKey(Schema.Boolean),
});

export interface ProcessKillRequest extends Schema.Schema.Type<
  typeof ProcessKillRequest
> {}

/**
 * Opens, closes or toggles the Omarchy menu at a route from the desktop
 * module's `omarchy.menus`, or one of its aliases. Closing needs no `id`.
 */
export const OmarchyMenuRequest = Schema.Struct({
  action: OmarchyAction,
  id: Schema.optionalKey(Schema.String),
});

export interface OmarchyMenuRequest extends Schema.Schema.Type<
  typeof OmarchyMenuRequest
> {}

/** Opens, closes or toggles a panel from the desktop module's `omarchy.panels`. */
export const OmarchyPanelRequest = Schema.Struct({
  id: Schema.String,
  action: OmarchyAction,
});

export interface OmarchyPanelRequest extends Schema.Schema.Type<
  typeof OmarchyPanelRequest
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

export const CommandIdRequest = Schema.Struct({ id: Schema.String });

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
