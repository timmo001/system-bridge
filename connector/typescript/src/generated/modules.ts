// Auto-generated file. Do not edit manually.
// Generated from backend types in types/ directory

import { Schema } from "effect";

export const BatteryScope = Schema.Literals(["system", "device"]);

export type BatteryScope = typeof BatteryScope.Type;

export const BatteryState = Schema.Literals([
  "charging",
  "discharging",
  "full",
  "not_charging",
  "empty",
  "unknown",
]);

export type BatteryState = typeof BatteryState.Type;

export const DesktopCompositor = Schema.Literals([
  "hyprland",
  "wayland",
  "windows",
]);

export type DesktopCompositor = typeof DesktopCompositor.Type;

export const DiskMountCategory = Schema.Literals([
  "primary",
  "bind",
  "squashfs",
]);

export type DiskMountCategory = typeof DiskMountCategory.Type;

export const DisplayPowerState = Schema.Literals([
  "on",
  "standby",
  "suspend",
  "off",
]);

export type DisplayPowerState = typeof DisplayPowerState.Type;

export const HyprlandDirection = Schema.Literals([
  "down",
  "left",
  "right",
  "up",
]);

export type HyprlandDirection = typeof HyprlandDirection.Type;

export const HyprlandDispatcher = Schema.Literals([
  "center_window",
  "cycle_next_window",
  "cycle_previous_window",
  "group_next",
  "group_previous",
  "lock_group",
  "lock_groups",
  "move_focus",
  "swap_window",
  "toggle_group",
  "toggle_split",
  "unlock_group",
  "unlock_groups",
]);

export type HyprlandDispatcher = typeof HyprlandDispatcher.Type;

export const HyprlandFullscreenMode = Schema.Literals([
  "fullscreen",
  "maximised",
  "none",
]);

export type HyprlandFullscreenMode = typeof HyprlandFullscreenMode.Type;

export const HyprlandOptionType = Schema.Literals(["bool", "int"]);

export type HyprlandOptionType = typeof HyprlandOptionType.Type;

export const HyprlandScreencastType = Schema.Literals([
  "monitor",
  "region",
  "window",
]);

export type HyprlandScreencastType = typeof HyprlandScreencastType.Type;

export const ModuleName = Schema.Literals([
  "audio",
  "battery",
  "bluetooth",
  "cpu",
  "desktop",
  "disks",
  "discord",
  "displays",
  "gpus",
  "media",
  "memory",
  "networks",
  "processes",
  "sensors",
  "system",
]);

export type ModuleName = typeof ModuleName.Type;

export const OmarchyAction = Schema.Literals(["close", "open", "toggle"]);

export type OmarchyAction = typeof OmarchyAction.Type;

export const RunMode = Schema.Literals(["standalone"]);

export type RunMode = typeof RunMode.Type;

export const AudioApp = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  title: Schema.NullOr(Schema.String),
  volume: Schema.NullOr(Schema.Finite),
  muted: Schema.NullOr(Schema.Boolean),
  playing: Schema.Boolean,
  output: Schema.NullOr(Schema.String),
});

export interface AudioApp extends Schema.Schema.Type<typeof AudioApp> {}

export const AudioDevice = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  volume: Schema.NullOr(Schema.Finite),
  muted: Schema.NullOr(Schema.Boolean),
  default: Schema.Boolean,
});

export interface AudioDevice extends Schema.Schema.Type<typeof AudioDevice> {}

export const AudioData = Schema.Struct({
  outputs: Schema.Array(AudioDevice),
  inputs: Schema.Array(AudioDevice),
  apps: Schema.Array(AudioApp),
});

export interface AudioData extends Schema.Schema.Type<typeof AudioData> {}

export const BatteryInfo = Schema.Struct({
  name: Schema.String,
  model: Schema.NullOr(Schema.String),
  scope: BatteryScope,
  state: BatteryState,
  percentage: Schema.NullOr(Schema.Finite),
  time_remaining: Schema.NullOr(Schema.Finite),
  power: Schema.NullOr(Schema.Finite),
  voltage: Schema.NullOr(Schema.Finite),
});

export interface BatteryInfo extends Schema.Schema.Type<typeof BatteryInfo> {}

export const BatteryData = Schema.Struct({
  is_charging: Schema.NullOr(Schema.Boolean),
  percentage: Schema.NullOr(Schema.Finite),
  time_remaining: Schema.NullOr(Schema.Finite),
  state: Schema.NullOr(BatteryState),
  power: Schema.NullOr(Schema.Finite),
  voltage: Schema.NullOr(Schema.Finite),
  ac_connected: Schema.NullOr(Schema.Boolean),
  batteries: Schema.Array(BatteryInfo),
});

export interface BatteryData extends Schema.Schema.Type<typeof BatteryData> {}

export const BluetoothDevice = Schema.Struct({
  address: Schema.String,
  name: Schema.String,
  type: Schema.NullOr(Schema.String),
  connected: Schema.Boolean,
});

export interface BluetoothDevice extends Schema.Schema.Type<
  typeof BluetoothDevice
> {}

export const BluetoothData = Schema.Struct({
  devices: Schema.Array(BluetoothDevice),
  powered: Schema.NullOr(Schema.Boolean),
});

export interface BluetoothData extends Schema.Schema.Type<
  typeof BluetoothData
> {}

export const CPUFrequency = Schema.Struct({
  current: Schema.NullOr(Schema.Finite),
  min: Schema.NullOr(Schema.Finite),
  max: Schema.NullOr(Schema.Finite),
});

export interface CPUFrequency extends Schema.Schema.Type<typeof CPUFrequency> {}

export const CPUTimes = Schema.Struct({
  user: Schema.NullOr(Schema.Finite),
  system: Schema.NullOr(Schema.Finite),
  idle: Schema.NullOr(Schema.Finite),
  interrupt: Schema.NullOr(Schema.Finite),
  dpc: Schema.NullOr(Schema.Finite),
});

export interface CPUTimes extends Schema.Schema.Type<typeof CPUTimes> {}

export const PerCPU = Schema.Struct({
  id: Schema.Finite,
  frequency: Schema.NullOr(CPUFrequency),
  power: Schema.NullOr(Schema.Finite),
  times: Schema.NullOr(CPUTimes),
  times_percent: Schema.NullOr(CPUTimes),
  usage: Schema.NullOr(Schema.Finite),
  voltage: Schema.NullOr(Schema.Finite),
});

export interface PerCPU extends Schema.Schema.Type<typeof PerCPU> {}

export const CPUStats = Schema.Struct({
  ctx_switches: Schema.NullOr(Schema.Finite),
  interrupts: Schema.NullOr(Schema.Finite),
  soft_interrupts: Schema.NullOr(Schema.Finite),
  syscalls: Schema.NullOr(Schema.Finite),
});

export interface CPUStats extends Schema.Schema.Type<typeof CPUStats> {}

export const CPUData = Schema.Struct({
  count: Schema.NullOr(Schema.Finite),
  name: Schema.NullOr(Schema.String),
  vendor: Schema.NullOr(Schema.String),
  family: Schema.NullOr(Schema.String),
  frequency: Schema.NullOr(CPUFrequency),
  load_average: Schema.NullOr(Schema.Finite),
  load_average_5: Schema.NullOr(Schema.Finite),
  load_average_15: Schema.NullOr(Schema.Finite),
  per_cpu: Schema.Array(PerCPU),
  power: Schema.NullOr(Schema.Finite),
  stats: Schema.NullOr(CPUStats),
  temperature: Schema.NullOr(Schema.Finite),
  times: Schema.NullOr(CPUTimes),
  times_percent: Schema.NullOr(CPUTimes),
  usage: Schema.NullOr(Schema.Finite),
  voltage: Schema.NullOr(Schema.Finite),
});

export interface CPUData extends Schema.Schema.Type<typeof CPUData> {}

export const CommandPrefab = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.String,
  available: Schema.Boolean,
  command: Schema.String,
  arguments: Schema.Array(Schema.String),
  reason: Schema.String,
});

export interface CommandPrefab extends Schema.Schema.Type<
  typeof CommandPrefab
> {}

export const DesktopKeyboard = Schema.Struct({
  layout: Schema.NullOr(Schema.String),
  name: Schema.NullOr(Schema.String),
  layouts: Schema.Array(Schema.String),
});

export interface DesktopKeyboard extends Schema.Schema.Type<
  typeof DesktopKeyboard
> {}

export const DesktopWindow = Schema.Struct({
  id: Schema.String,
  app: Schema.NullOr(Schema.String),
  title: Schema.NullOr(Schema.String),
  pid: Schema.NullOr(Schema.Finite),
  workspace: Schema.NullOr(Schema.String),
  display: Schema.NullOr(Schema.String),
  x: Schema.NullOr(Schema.Finite),
  y: Schema.NullOr(Schema.Finite),
  width: Schema.NullOr(Schema.Finite),
  height: Schema.NullOr(Schema.Finite),
  focused: Schema.Boolean,
  fullscreen: Schema.NullOr(Schema.Boolean),
  maximised: Schema.NullOr(Schema.Boolean),
  minimised: Schema.NullOr(Schema.Boolean),
  floating: Schema.NullOr(Schema.Boolean),
  urgent: Schema.NullOr(Schema.Boolean),
  inhibiting_idle: Schema.NullOr(Schema.Boolean),
  content_type: Schema.NullOr(Schema.String),
});

export interface DesktopWindow extends Schema.Schema.Type<
  typeof DesktopWindow
> {}

export const DesktopWorkspace = Schema.Struct({
  id: Schema.String,
  name: Schema.NullOr(Schema.String),
  display: Schema.NullOr(Schema.String),
  active: Schema.Boolean,
  focused: Schema.Boolean,
  special: Schema.NullOr(Schema.Boolean),
  windows: Schema.NullOr(Schema.Finite),
  fullscreen: Schema.NullOr(Schema.Boolean),
});

export interface DesktopWorkspace extends Schema.Schema.Type<
  typeof DesktopWorkspace
> {}

export const HyprlandVersion = Schema.Struct({
  version: Schema.String,
  tag: Schema.String,
  commit: Schema.String,
  branch: Schema.String,
  config_provider: Schema.NullOr(Schema.String),
  backend: Schema.NullOr(Schema.String),
});

export interface HyprlandVersion extends Schema.Schema.Type<
  typeof HyprlandVersion
> {}

export const HyprlandScreencast = Schema.Struct({
  type: HyprlandScreencastType,
  display: Schema.NullOr(Schema.String),
  window: Schema.NullOr(Schema.String),
});

export interface HyprlandScreencast extends Schema.Schema.Type<
  typeof HyprlandScreencast
> {}

export const HyprlandReserved = Schema.Struct({
  top: Schema.Finite,
  right: Schema.Finite,
  bottom: Schema.Finite,
  left: Schema.Finite,
});

export interface HyprlandReserved extends Schema.Schema.Type<
  typeof HyprlandReserved
> {}

export const HyprlandLayers = Schema.Struct({
  background: Schema.Array(Schema.String),
  bottom: Schema.Array(Schema.String),
  top: Schema.Array(Schema.String),
  overlay: Schema.Array(Schema.String),
});

export interface HyprlandLayers extends Schema.Schema.Type<
  typeof HyprlandLayers
> {}

export const HyprlandDisplay = Schema.Struct({
  scale: Schema.Finite,
  transform: Schema.Finite,
  vrr: Schema.Boolean,
  tearing: Schema.Boolean,
  direct_scanout: Schema.Boolean,
  colour_preset: Schema.NullOr(Schema.String),
  format: Schema.NullOr(Schema.String),
  dpms: Schema.Boolean,
  mirror_of: Schema.NullOr(Schema.String),
  reserved: HyprlandReserved,
  special_workspace: Schema.NullOr(Schema.String),
  layers: HyprlandLayers,
});

export interface HyprlandDisplay extends Schema.Schema.Type<
  typeof HyprlandDisplay
> {}

export const HyprlandKeyboard = Schema.Struct({
  name: Schema.String,
  layouts: Schema.Array(Schema.String),
  variant: Schema.NullOr(Schema.String),
  options: Schema.NullOr(Schema.String),
  active_layout: Schema.Finite,
  active_keymap: Schema.NullOr(Schema.String),
  main: Schema.Boolean,
});

export interface HyprlandKeyboard extends Schema.Schema.Type<
  typeof HyprlandKeyboard
> {}

export const HyprlandMouse = Schema.Struct({
  name: Schema.String,
  speed: Schema.Finite,
  scroll_factor: Schema.Finite,
});

export interface HyprlandMouse extends Schema.Schema.Type<
  typeof HyprlandMouse
> {}

export const HyprlandBind = Schema.Struct({
  modifiers: Schema.Array(Schema.String),
  key: Schema.String,
  submap: Schema.NullOr(Schema.String),
  description: Schema.NullOr(Schema.String),
  dispatcher: Schema.NullOr(Schema.String),
  argument: Schema.NullOr(Schema.String),
  locked: Schema.Boolean,
  release: Schema.Boolean,
  repeat: Schema.Boolean,
  long_press: Schema.Boolean,
  non_consuming: Schema.Boolean,
});

export interface HyprlandBind extends Schema.Schema.Type<typeof HyprlandBind> {}

export const HyprlandGlobalShortcut = Schema.Struct({
  name: Schema.String,
  description: Schema.String,
});

export interface HyprlandGlobalShortcut extends Schema.Schema.Type<
  typeof HyprlandGlobalShortcut
> {}

export const HyprlandWindow = Schema.Struct({
  fullscreen_mode: HyprlandFullscreenMode,
  pinned: Schema.Boolean,
  xwayland: Schema.Boolean,
  hidden: Schema.Boolean,
  group: Schema.Array(Schema.String),
  swallowing: Schema.NullOr(Schema.String),
  tags: Schema.Array(Schema.String),
  focus_history: Schema.Finite,
  initial_app: Schema.NullOr(Schema.String),
  xdg_tag: Schema.NullOr(Schema.String),
  xdg_description: Schema.NullOr(Schema.String),
  tearing_hint: Schema.Boolean,
  visible: Schema.Boolean,
  stable_id: Schema.String,
  initial_title: Schema.NullOr(Schema.String),
});

export interface HyprlandWindow extends Schema.Schema.Type<
  typeof HyprlandWindow
> {}

export const HyprlandWorkspace = Schema.Struct({
  layout: Schema.NullOr(Schema.String),
  persistent: Schema.Boolean,
  last_window: Schema.NullOr(Schema.String),
});

export interface HyprlandWorkspace extends Schema.Schema.Type<
  typeof HyprlandWorkspace
> {}

export const HyprlandOption = Schema.Struct({
  name: Schema.String,
  type: HyprlandOptionType,
  bool: Schema.NullOr(Schema.Boolean),
  int: Schema.NullOr(Schema.Finite),
});

export interface HyprlandOption extends Schema.Schema.Type<
  typeof HyprlandOption
> {}

export const HyprlandData = Schema.Struct({
  version: HyprlandVersion,
  submap: Schema.NullOr(Schema.String),
  screencasts: Schema.Array(HyprlandScreencast),
  config_errors: Schema.Array(Schema.String),
  group_lock: Schema.Boolean,
  displays: Schema.Record(Schema.String, HyprlandDisplay),
  keyboards: Schema.Array(HyprlandKeyboard),
  mice: Schema.Array(HyprlandMouse),
  tablets: Schema.Array(Schema.String),
  touch: Schema.Array(Schema.String),
  switches: Schema.Array(Schema.String),
  binds: Schema.Array(HyprlandBind),
  global_shortcuts: Schema.Array(HyprlandGlobalShortcut),
  windows: Schema.Record(Schema.String, HyprlandWindow),
  workspaces: Schema.Record(Schema.String, HyprlandWorkspace),
  options: Schema.Array(HyprlandOption),
});

export interface HyprlandData extends Schema.Schema.Type<typeof HyprlandData> {}

export const OmarchyMenu = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  aliases: Schema.Array(Schema.String),
});

export interface OmarchyMenu extends Schema.Schema.Type<typeof OmarchyMenu> {}

export const OmarchyPanel = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
});

export interface OmarchyPanel extends Schema.Schema.Type<typeof OmarchyPanel> {}

export const OmarchyArgument = Schema.Struct({
  name: Schema.String,
  type: Schema.String,
});

export interface OmarchyArgument extends Schema.Schema.Type<
  typeof OmarchyArgument
> {}

export const OmarchyFunction = Schema.Struct({
  name: Schema.String,
  arguments: Schema.Array(OmarchyArgument),
  returns: Schema.String,
});

export interface OmarchyFunction extends Schema.Schema.Type<
  typeof OmarchyFunction
> {}

export const OmarchyTarget = Schema.Struct({
  name: Schema.String,
  functions: Schema.Array(OmarchyFunction),
});

export interface OmarchyTarget extends Schema.Schema.Type<
  typeof OmarchyTarget
> {}

export const OmarchyData = Schema.Struct({
  menus: Schema.Array(OmarchyMenu),
  panels: Schema.Array(OmarchyPanel),
  targets: Schema.Array(OmarchyTarget),
});

export interface OmarchyData extends Schema.Schema.Type<typeof OmarchyData> {}

export const DesktopData = Schema.Struct({
  compositor: DesktopCompositor,
  focused_window: Schema.NullOr(Schema.String),
  focused_workspace: Schema.NullOr(Schema.String),
  focused_display: Schema.NullOr(Schema.String),
  keyboard: DesktopKeyboard,
  windows: Schema.Array(DesktopWindow),
  workspaces: Schema.Array(DesktopWorkspace),
  hyprland: Schema.NullOr(HyprlandData),
  omarchy: Schema.NullOr(OmarchyData),
});

export interface DesktopData extends Schema.Schema.Type<typeof DesktopData> {}

export const DeviceInfo = Schema.Struct({
  manufacturer: Schema.NullOr(Schema.String),
  model: Schema.NullOr(Schema.String),
  version: Schema.NullOr(Schema.String),
  board_vendor: Schema.NullOr(Schema.String),
  board_name: Schema.NullOr(Schema.String),
  bios_vendor: Schema.NullOr(Schema.String),
  bios_version: Schema.NullOr(Schema.String),
  chassis_type: Schema.NullOr(Schema.String),
});

export interface DeviceInfo extends Schema.Schema.Type<typeof DeviceInfo> {}

export const DiscordDevice = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
});

export interface DiscordDevice extends Schema.Schema.Type<
  typeof DiscordDevice
> {}

export const DiscordAudio = Schema.Struct({
  volume: Schema.NullOr(Schema.Finite),
  device_id: Schema.NullOr(Schema.String),
  devices: Schema.Array(DiscordDevice),
});

export interface DiscordAudio extends Schema.Schema.Type<typeof DiscordAudio> {}

export const DiscordChannel = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  type: Schema.NullOr(Schema.String),
  bitrate: Schema.NullOr(Schema.Finite),
  user_limit: Schema.NullOr(Schema.Finite),
});

export interface DiscordChannel extends Schema.Schema.Type<
  typeof DiscordChannel
> {}

export const DiscordServer = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  icon_url: Schema.NullOr(Schema.String),
});

export interface DiscordServer extends Schema.Schema.Type<
  typeof DiscordServer
> {}

export const DiscordVoiceConnection = Schema.Struct({
  state: Schema.String,
  last_ping: Schema.NullOr(Schema.Finite),
  average_ping: Schema.NullOr(Schema.Finite),
});

export interface DiscordVoiceConnection extends Schema.Schema.Type<
  typeof DiscordVoiceConnection
> {}

export const DiscordUser = Schema.Struct({
  id: Schema.String,
  username: Schema.String,
  global_name: Schema.NullOr(Schema.String),
  avatar_url: Schema.NullOr(Schema.String),
});

export interface DiscordUser extends Schema.Schema.Type<typeof DiscordUser> {}

export const DiscordCallMember = Schema.Struct({
  user: DiscordUser,
  nick: Schema.NullOr(Schema.String),
  server_mute: Schema.Boolean,
  server_deaf: Schema.Boolean,
  self_mute: Schema.Boolean,
  self_deaf: Schema.Boolean,
  suppress: Schema.Boolean,
  speaking: Schema.Boolean,
  local_mute: Schema.NullOr(Schema.Boolean),
  volume: Schema.NullOr(Schema.Finite),
});

export interface DiscordCallMember extends Schema.Schema.Type<
  typeof DiscordCallMember
> {}

export const DiscordCall = Schema.Struct({
  channel: DiscordChannel,
  server: Schema.NullOr(DiscordServer),
  connection: Schema.NullOr(DiscordVoiceConnection),
  me: Schema.NullOr(DiscordCallMember),
  members: Schema.Array(DiscordCallMember),
});

export interface DiscordCall extends Schema.Schema.Type<typeof DiscordCall> {}

export const DiscordVoiceMode = Schema.Struct({
  type: Schema.NullOr(Schema.String),
  auto_threshold: Schema.NullOr(Schema.Boolean),
  threshold: Schema.NullOr(Schema.Finite),
  delay: Schema.NullOr(Schema.Finite),
});

export interface DiscordVoiceMode extends Schema.Schema.Type<
  typeof DiscordVoiceMode
> {}

export const DiscordVoiceProcessing = Schema.Struct({
  noise_suppression: Schema.NullOr(Schema.Boolean),
  echo_cancellation: Schema.NullOr(Schema.Boolean),
  automatic_gain_control: Schema.NullOr(Schema.Boolean),
});

export interface DiscordVoiceProcessing extends Schema.Schema.Type<
  typeof DiscordVoiceProcessing
> {}

export const DiscordSound = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  server_id: Schema.NullOr(Schema.String),
  emoji: Schema.NullOr(Schema.String),
  emoji_url: Schema.NullOr(Schema.String),
});

export interface DiscordSound extends Schema.Schema.Type<typeof DiscordSound> {}

export const DiscordNotification = Schema.Struct({
  message_id: Schema.NullOr(Schema.String),
  channel_id: Schema.String,
  title: Schema.String,
  body: Schema.String,
  icon_url: Schema.NullOr(Schema.String),
});

export interface DiscordNotification extends Schema.Schema.Type<
  typeof DiscordNotification
> {}

export const DiscordData = Schema.Struct({
  connected: Schema.Boolean,
  authenticated: Schema.Boolean,
  user: Schema.NullOr(DiscordUser),
  call: Schema.NullOr(DiscordCall),
  mute: Schema.NullOr(Schema.Boolean),
  deaf: Schema.NullOr(Schema.Boolean),
  input: Schema.NullOr(DiscordAudio),
  output: Schema.NullOr(DiscordAudio),
  mode: Schema.NullOr(DiscordVoiceMode),
  processing: Schema.NullOr(DiscordVoiceProcessing),
  qos: Schema.NullOr(Schema.Boolean),
  silence_warning: Schema.NullOr(Schema.Boolean),
  video: Schema.NullOr(Schema.Boolean),
  screenshare: Schema.NullOr(Schema.Boolean),
  sounds: Schema.NullOr(Schema.Array(DiscordSound)),
  notification: Schema.NullOr(DiscordNotification),
  error: Schema.optionalKey(Schema.NullOr(Schema.String)),
});

export interface DiscordData extends Schema.Schema.Type<typeof DiscordData> {}

export const DiskUsage = Schema.Struct({
  total: Schema.Finite,
  used: Schema.Finite,
  free: Schema.Finite,
  percent: Schema.Finite,
});

export interface DiskUsage extends Schema.Schema.Type<typeof DiskUsage> {}

export const DiskPartition = Schema.Struct({
  device: Schema.String,
  mount_point: Schema.String,
  filesystem_type: Schema.String,
  options: Schema.String,
  max_file_size: Schema.Finite,
  max_path_length: Schema.Finite,
  category: DiskMountCategory,
  usage: Schema.NullOr(DiskUsage),
});

export interface DiskPartition extends Schema.Schema.Type<
  typeof DiskPartition
> {}

export const DiskIOCounters = Schema.Struct({
  read_count: Schema.Finite,
  write_count: Schema.Finite,
  read_bytes: Schema.Finite,
  write_bytes: Schema.Finite,
  read_time: Schema.Finite,
  write_time: Schema.Finite,
  read_bytes_rate: Schema.NullOr(Schema.Finite),
  write_bytes_rate: Schema.NullOr(Schema.Finite),
});

export interface DiskIOCounters extends Schema.Schema.Type<
  typeof DiskIOCounters
> {}

export const Disk = Schema.Struct({
  name: Schema.String,
  partitions: Schema.Array(DiskPartition),
  io_counters: Schema.NullOr(DiskIOCounters),
  temperature: Schema.NullOr(Schema.Finite),
});

export interface Disk extends Schema.Schema.Type<typeof Disk> {}

export const DiskMountInfo = Schema.Struct({
  device: Schema.String,
  mount_point: Schema.String,
  filesystem_type: Schema.String,
  category: DiskMountCategory,
  usage: Schema.NullOr(DiskUsage),
});

export interface DiskMountInfo extends Schema.Schema.Type<
  typeof DiskMountInfo
> {}

export const DiskMountsSecondary = Schema.Struct({
  bind: Schema.Array(DiskMountInfo),
  squashfs: Schema.Array(DiskMountInfo),
});

export interface DiskMountsSecondary extends Schema.Schema.Type<
  typeof DiskMountsSecondary
> {}

export const DiskMountsResponse = Schema.Struct({
  primary: Schema.Array(DiskMountInfo),
  secondary: DiskMountsSecondary,
});

export interface DiskMountsResponse extends Schema.Schema.Type<
  typeof DiskMountsResponse
> {}

export const DisksData = Schema.Struct({
  devices: Schema.Array(Disk),
  io_counters: Schema.NullOr(DiskIOCounters),
});

export interface DisksData extends Schema.Schema.Type<typeof DisksData> {}

export const Display = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  resolution_horizontal: Schema.Finite,
  resolution_vertical: Schema.Finite,
  x: Schema.NullOr(Schema.Finite),
  y: Schema.NullOr(Schema.Finite),
  width: Schema.NullOr(Schema.Finite),
  height: Schema.NullOr(Schema.Finite),
  is_primary: Schema.NullOr(Schema.Boolean),
  pixel_clock: Schema.NullOr(Schema.Finite),
  refresh_rate: Schema.NullOr(Schema.Finite),
  brightness: Schema.NullOr(Schema.Finite),
  power_state: Schema.NullOr(DisplayPowerState),
});

export interface Display extends Schema.Schema.Type<typeof Display> {}

export const DisplaysData = Schema.Array(Display);

export type DisplaysData = typeof DisplaysData.Type;

export const Fan = Schema.Struct({
  key: Schema.String,
  name: Schema.String,
  label: Schema.String,
  speed_rpm: Schema.NullOr(Schema.Finite),
  speed_min: Schema.NullOr(Schema.Finite),
  speed_max: Schema.NullOr(Schema.Finite),
});

export interface Fan extends Schema.Schema.Type<typeof Fan> {}

export const GPU = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  core_clock: Schema.NullOr(Schema.Finite),
  core_load: Schema.NullOr(Schema.Finite),
  decoder_load: Schema.NullOr(Schema.Finite),
  encoder_load: Schema.NullOr(Schema.Finite),
  fan_speed: Schema.NullOr(Schema.Finite),
  fan_speed_percent: Schema.NullOr(Schema.Finite),
  memory_clock: Schema.NullOr(Schema.Finite),
  memory_load: Schema.NullOr(Schema.Finite),
  memory_free: Schema.NullOr(Schema.Finite),
  memory_used: Schema.NullOr(Schema.Finite),
  memory_total: Schema.NullOr(Schema.Finite),
  performance_state: Schema.NullOr(Schema.String),
  power_limit: Schema.NullOr(Schema.Finite),
  power_usage: Schema.NullOr(Schema.Finite),
  temperature: Schema.NullOr(Schema.Finite),
});

export interface GPU extends Schema.Schema.Type<typeof GPU> {}

export const HistorySample = Schema.Struct({
  time: Schema.Finite,
  value: Schema.Finite,
});

export interface HistorySample extends Schema.Schema.Type<
  typeof HistorySample
> {}

export const GPUHistory = Schema.Struct({
  id: Schema.String,
  core_load: Schema.Array(HistorySample),
  memory_load: Schema.Array(HistorySample),
  temperature: Schema.Array(HistorySample),
  power: Schema.Array(HistorySample),
});

export interface GPUHistory extends Schema.Schema.Type<typeof GPUHistory> {}

export const GPUsData = Schema.Array(GPU);

export type GPUsData = typeof GPUsData.Type;

export const HyprlandEvent = Schema.Struct({
  data: Schema.String,
});

export interface HyprlandEvent extends Schema.Schema.Type<
  typeof HyprlandEvent
> {}

export const MediaPlayer = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  status: Schema.String,
  title: Schema.String,
  artist: Schema.String,
});

export interface MediaPlayer extends Schema.Schema.Type<typeof MediaPlayer> {}

export const MediaData = Schema.Struct({
  album_artist: Schema.NullOr(Schema.String),
  album_title: Schema.NullOr(Schema.String),
  artist: Schema.NullOr(Schema.String),
  duration: Schema.NullOr(Schema.Finite),
  is_fast_forward_enabled: Schema.NullOr(Schema.Boolean),
  is_next_enabled: Schema.NullOr(Schema.Boolean),
  is_pause_enabled: Schema.NullOr(Schema.Boolean),
  is_play_enabled: Schema.NullOr(Schema.Boolean),
  is_previous_enabled: Schema.NullOr(Schema.Boolean),
  is_rewind_enabled: Schema.NullOr(Schema.Boolean),
  is_seek_enabled: Schema.NullOr(Schema.Boolean),
  is_stop_enabled: Schema.NullOr(Schema.Boolean),
  playback_rate: Schema.NullOr(Schema.Finite),
  player: Schema.NullOr(Schema.String),
  players: Schema.Array(MediaPlayer),
  position: Schema.NullOr(Schema.Finite),
  repeat: Schema.NullOr(Schema.String),
  shuffle: Schema.NullOr(Schema.Boolean),
  status: Schema.NullOr(Schema.String),
  subtitle: Schema.NullOr(Schema.String),
  thumbnail: Schema.NullOr(Schema.String),
  title: Schema.NullOr(Schema.String),
  track_number: Schema.NullOr(Schema.Finite),
  type: Schema.NullOr(Schema.String),
  updated_at: Schema.NullOr(Schema.Finite),
  volume: Schema.NullOr(Schema.Finite),
});

export interface MediaData extends Schema.Schema.Type<typeof MediaData> {}

export const MemorySwap = Schema.Struct({
  total: Schema.NullOr(Schema.Finite),
  used: Schema.NullOr(Schema.Finite),
  free: Schema.NullOr(Schema.Finite),
  percent: Schema.NullOr(Schema.Finite),
  sin: Schema.NullOr(Schema.Finite),
  sout: Schema.NullOr(Schema.Finite),
});

export interface MemorySwap extends Schema.Schema.Type<typeof MemorySwap> {}

export const MemoryVirtual = Schema.Struct({
  total: Schema.NullOr(Schema.Finite),
  available: Schema.NullOr(Schema.Finite),
  percent: Schema.NullOr(Schema.Finite),
  used: Schema.NullOr(Schema.Finite),
  free: Schema.NullOr(Schema.Finite),
  active: Schema.NullOr(Schema.Finite),
  inactive: Schema.NullOr(Schema.Finite),
  buffers: Schema.NullOr(Schema.Finite),
  cached: Schema.NullOr(Schema.Finite),
  wired: Schema.NullOr(Schema.Finite),
  shared: Schema.NullOr(Schema.Finite),
});

export interface MemoryVirtual extends Schema.Schema.Type<
  typeof MemoryVirtual
> {}

export const MemoryData = Schema.Struct({
  swap: Schema.NullOr(MemorySwap),
  virtual: Schema.NullOr(MemoryVirtual),
});

export interface MemoryData extends Schema.Schema.Type<typeof MemoryData> {}

export const SeriesHistory = Schema.Struct({
  id: Schema.String,
  samples: Schema.Array(HistorySample),
});

export interface SeriesHistory extends Schema.Schema.Type<
  typeof SeriesHistory
> {}

export const MetricHistory = Schema.Struct({
  cpu: Schema.Array(HistorySample),
  cpu_temperature: Schema.Array(HistorySample),
  cpu_frequency: Schema.Array(HistorySample),
  cpu_power: Schema.Array(HistorySample),
  load_average: Schema.Array(HistorySample),
  memory: Schema.Array(HistorySample),
  swap: Schema.Array(HistorySample),
  battery: Schema.Array(HistorySample),
  system_power: Schema.Array(HistorySample),
  network_receive: Schema.Array(HistorySample),
  network_send: Schema.Array(HistorySample),
  disk_read: Schema.Array(HistorySample),
  disk_write: Schema.Array(HistorySample),
  disk_temperatures: Schema.Array(SeriesHistory),
  gpus: Schema.Array(GPUHistory),
  temperatures: Schema.Array(SeriesHistory),
  fans: Schema.Array(SeriesHistory),
});

export interface MetricHistory extends Schema.Schema.Type<
  typeof MetricHistory
> {}

export const Module = Schema.Struct({
  module: ModuleName,
  data: Schema.Unknown,
  updated: Schema.String,
});

export interface Module extends Schema.Schema.Type<typeof Module> {}

export const NetworkAddress = Schema.Struct({
  address: Schema.NullOr(Schema.String),
  family: Schema.NullOr(Schema.String),
  netmask: Schema.NullOr(Schema.String),
  broadcast: Schema.NullOr(Schema.String),
  ptp: Schema.NullOr(Schema.String),
});

export interface NetworkAddress extends Schema.Schema.Type<
  typeof NetworkAddress
> {}

export const NetworkStats = Schema.Struct({
  isup: Schema.NullOr(Schema.Boolean),
  duplex: Schema.NullOr(Schema.String),
  speed: Schema.NullOr(Schema.Finite),
  mtu: Schema.NullOr(Schema.Finite),
  flags: Schema.Array(Schema.String),
});

export interface NetworkStats extends Schema.Schema.Type<typeof NetworkStats> {}

export const NetworkIO = Schema.Struct({
  bytes_sent: Schema.NullOr(Schema.Finite),
  bytes_recv: Schema.NullOr(Schema.Finite),
  packets_sent: Schema.NullOr(Schema.Finite),
  packets_recv: Schema.NullOr(Schema.Finite),
  errin: Schema.NullOr(Schema.Finite),
  errout: Schema.NullOr(Schema.Finite),
  dropin: Schema.NullOr(Schema.Finite),
  dropout: Schema.NullOr(Schema.Finite),
  bytes_sent_rate: Schema.NullOr(Schema.Finite),
  bytes_recv_rate: Schema.NullOr(Schema.Finite),
});

export interface NetworkIO extends Schema.Schema.Type<typeof NetworkIO> {}

export const NetworkWifi = Schema.Struct({
  ssid: Schema.NullOr(Schema.String),
  signal: Schema.NullOr(Schema.Finite),
  signal_percent: Schema.NullOr(Schema.Finite),
  link_rate: Schema.NullOr(Schema.Finite),
});

export interface NetworkWifi extends Schema.Schema.Type<typeof NetworkWifi> {}

export const Network = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  addresses: Schema.Array(NetworkAddress),
  stats: Schema.NullOr(NetworkStats),
  io: Schema.NullOr(NetworkIO),
  wifi: Schema.NullOr(NetworkWifi),
});

export interface Network extends Schema.Schema.Type<typeof Network> {}

export const NetworkConnection = Schema.Struct({
  fd: Schema.NullOr(Schema.Finite),
  family: Schema.NullOr(Schema.Finite),
  type: Schema.NullOr(Schema.Finite),
  laddr: Schema.NullOr(Schema.String),
  raddr: Schema.NullOr(Schema.String),
  status: Schema.NullOr(Schema.String),
  pid: Schema.NullOr(Schema.Finite),
});

export interface NetworkConnection extends Schema.Schema.Type<
  typeof NetworkConnection
> {}

export const NetworksData = Schema.Struct({
  connections: Schema.Array(NetworkConnection),
  io: Schema.NullOr(NetworkIO),
  networks: Schema.Array(Network),
});

export interface NetworksData extends Schema.Schema.Type<typeof NetworksData> {}

export const Process = Schema.Struct({
  id: Schema.Finite,
  name: Schema.NullOr(Schema.String),
  cpu_usage: Schema.NullOr(Schema.Finite),
  created: Schema.NullOr(Schema.Finite),
  memory_usage: Schema.NullOr(Schema.Finite),
  path: Schema.NullOr(Schema.String),
  status: Schema.NullOr(Schema.String),
  username: Schema.NullOr(Schema.String),
  working_directory: Schema.NullOr(Schema.String),
});

export interface Process extends Schema.Schema.Type<typeof Process> {}

export const ProcessesData = Schema.Array(Process);

export type ProcessesData = typeof ProcessesData.Type;

export const Temperature = Schema.Struct({
  key: Schema.String,
  temperature: Schema.Finite,
  high: Schema.Finite,
  critical: Schema.Finite,
});

export interface Temperature extends Schema.Schema.Type<typeof Temperature> {}

export const SensorsWindowsSensor = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  type: Schema.String,
  value: Schema.Unknown,
});

export interface SensorsWindowsSensor extends Schema.Schema.Type<
  typeof SensorsWindowsSensor
> {}

export interface SensorsWindowsHardware {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly subhardware: ReadonlyArray<SensorsWindowsHardware>;
  readonly sensors: ReadonlyArray<SensorsWindowsSensor>;
}

export const SensorsWindowsHardware: Schema.Codec<SensorsWindowsHardware> =
  Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    type: Schema.String,
    subhardware: Schema.Array(
      Schema.suspend(
        (): Schema.Codec<SensorsWindowsHardware> => SensorsWindowsHardware,
      ),
    ),
    sensors: Schema.Array(SensorsWindowsSensor),
  });

export const SensorsNVIDIAChipset = Schema.Struct({
  id: Schema.Finite,
  name: Schema.String,
  flags: Schema.String,
  vendor_id: Schema.Finite,
  vendor_name: Schema.String,
});

export interface SensorsNVIDIAChipset extends Schema.Schema.Type<
  typeof SensorsNVIDIAChipset
> {}

export const SensorsNVIDIADisplay = Schema.Struct({
  id: Schema.Finite,
  name: Schema.String,
  active: Schema.Boolean,
  available: Schema.Boolean,
  connected: Schema.Boolean,
  dynamic: Schema.Boolean,
  aspect_horizontal: Schema.Finite,
  aspect_vertical: Schema.Finite,
  brightness_current: Schema.Finite,
  brightness_default: Schema.Finite,
  brightness_max: Schema.Finite,
  brightness_min: Schema.Finite,
  color_depth: Schema.String,
  connection_type: Schema.String,
  pixel_clock: Schema.Finite,
  refresh_rate: Schema.Finite,
  resolution_horizontal: Schema.Finite,
  resolution_vertical: Schema.Finite,
});

export interface SensorsNVIDIADisplay extends Schema.Schema.Type<
  typeof SensorsNVIDIADisplay
> {}

export const SensorsNVIDIADriver = Schema.Struct({
  branch_version: Schema.String,
  interface_version: Schema.String,
  version: Schema.Finite,
});

export interface SensorsNVIDIADriver extends Schema.Schema.Type<
  typeof SensorsNVIDIADriver
> {}

export const SensorsNVIDIAGPU = Schema.Struct({
  id: Schema.Finite,
  name: Schema.String,
  bios_oem_revision: Schema.NullOr(Schema.Finite),
  bios_revision: Schema.NullOr(Schema.Finite),
  bios_version: Schema.NullOr(Schema.String),
  current_fan_speed_level: Schema.NullOr(Schema.Finite),
  current_fan_speed_rpm: Schema.NullOr(Schema.Finite),
  driver_model: Schema.NullOr(Schema.Finite),
  memory_available: Schema.NullOr(Schema.Finite),
  memory_capacity: Schema.NullOr(Schema.Finite),
  memory_maker: Schema.NullOr(Schema.String),
  serial: Schema.NullOr(Schema.String),
  system_type: Schema.NullOr(Schema.String),
  type: Schema.NullOr(Schema.String),
});

export interface SensorsNVIDIAGPU extends Schema.Schema.Type<
  typeof SensorsNVIDIAGPU
> {}

export const SensorsNVIDIA = Schema.Struct({
  chipset: Schema.NullOr(SensorsNVIDIAChipset),
  displays: Schema.Array(SensorsNVIDIADisplay),
  driver: Schema.NullOr(SensorsNVIDIADriver),
  gpus: Schema.Array(SensorsNVIDIAGPU),
});

export interface SensorsNVIDIA extends Schema.Schema.Type<
  typeof SensorsNVIDIA
> {}

export const SensorsWindows = Schema.Struct({
  hardware: Schema.Array(SensorsWindowsHardware),
  nvidia: Schema.NullOr(SensorsNVIDIA),
});

export interface SensorsWindows extends Schema.Schema.Type<
  typeof SensorsWindows
> {}

export const SensorsData = Schema.Struct({
  fans: Schema.Array(Fan),
  temperatures: Schema.Array(Temperature),
  windows_sensors: Schema.NullOr(SensorsWindows),
});

export interface SensorsData extends Schema.Schema.Type<typeof SensorsData> {}

export const SystemUser = Schema.Struct({
  name: Schema.String,
  active: Schema.Boolean,
  terminal: Schema.String,
  host: Schema.String,
  started: Schema.Finite,
  pid: Schema.Finite,
});

export interface SystemUser extends Schema.Schema.Type<typeof SystemUser> {}

export const SystemPackageUpdate = Schema.Struct({
  name: Schema.String,
  version: Schema.String,
  current_version: Schema.NullOr(Schema.String),
});

export interface SystemPackageUpdate extends Schema.Schema.Type<
  typeof SystemPackageUpdate
> {}

export const SystemFailedUnit = Schema.Struct({
  name: Schema.String,
  description: Schema.String,
  scope: Schema.String,
  load_state: Schema.String,
  result: Schema.NullOr(Schema.String),
  since: Schema.NullOr(Schema.Finite),
});

export interface SystemFailedUnit extends Schema.Schema.Type<
  typeof SystemFailedUnit
> {}

export const SystemData = Schema.Struct({
  boot_time: Schema.Finite,
  fqdn: Schema.String,
  hostname: Schema.String,
  kernel_version: Schema.String,
  ip_address_4: Schema.String,
  mac_address: Schema.String,
  platform_version: Schema.String,
  platform: Schema.String,
  power_usage: Schema.NullOr(Schema.Finite),
  uptime: Schema.Finite,
  users: Schema.Array(SystemUser),
  uuid: Schema.String,
  version: Schema.String,
  camera_usage: Schema.Array(Schema.String),
  microphone_usage: Schema.Array(Schema.String),
  ip_address_6: Schema.String,
  pending_reboot: Schema.NullOr(Schema.Boolean),
  package_updates: Schema.NullOr(Schema.Finite),
  package_update_list: Schema.NullOr(Schema.Array(SystemPackageUpdate)),
  run_mode: RunMode,
  version_latest_url: Schema.NullOr(Schema.String),
  version_latest: Schema.NullOr(Schema.String),
  version_newer_available: Schema.NullOr(Schema.Boolean),
  device_info: Schema.NullOr(DeviceInfo),
  failed_units: Schema.NullOr(Schema.Array(SystemFailedUnit)),
  idle_time: Schema.NullOr(Schema.Finite),
  locked: Schema.NullOr(Schema.Boolean),
  power_profile: Schema.NullOr(Schema.String),
  power_profiles: Schema.Array(Schema.String),
  keep_awake: Schema.NullOr(Schema.Boolean),
  keep_awake_until: Schema.NullOr(Schema.Finite),
});

export interface SystemData extends Schema.Schema.Type<typeof SystemData> {}

export interface ModuleData {
  readonly audio: AudioData;
  readonly battery: BatteryData;
  readonly bluetooth: BluetoothData;
  readonly cpu: CPUData;
  readonly desktop: DesktopData;
  readonly discord: DiscordData;
  readonly disks: DisksData;
  readonly displays: DisplaysData;
  readonly gpus: GPUsData;
  readonly media: MediaData;
  readonly memory: MemoryData;
  readonly networks: NetworksData;
  readonly processes: ProcessesData;
  readonly sensors: SensorsData;
  readonly system: SystemData;
}

export type ModuleDataSchemas = {
  readonly [K in keyof ModuleData]: Schema.Decoder<ModuleData[K]>;
};

export const ModuleDataSchemas: ModuleDataSchemas = {
  audio: AudioData,
  battery: BatteryData,
  bluetooth: BluetoothData,
  cpu: CPUData,
  desktop: DesktopData,
  discord: DiscordData,
  disks: DisksData,
  displays: DisplaysData,
  gpus: GPUsData,
  media: MediaData,
  memory: MemoryData,
  networks: NetworksData,
  processes: ProcessesData,
  sensors: SensorsData,
  system: SystemData,
};

export const ModulesData = Schema.Struct({
  audio: Schema.optionalKey(AudioData),
  battery: Schema.optionalKey(BatteryData),
  bluetooth: Schema.optionalKey(BluetoothData),
  cpu: Schema.optionalKey(CPUData),
  desktop: Schema.optionalKey(DesktopData),
  discord: Schema.optionalKey(DiscordData),
  disks: Schema.optionalKey(DisksData),
  displays: Schema.optionalKey(DisplaysData),
  gpus: Schema.optionalKey(GPUsData),
  media: Schema.optionalKey(MediaData),
  memory: Schema.optionalKey(MemoryData),
  networks: Schema.optionalKey(NetworksData),
  processes: Schema.optionalKey(ProcessesData),
  sensors: Schema.optionalKey(SensorsData),
  system: Schema.optionalKey(SystemData),
});

export interface ModulesData extends Schema.Schema.Type<typeof ModulesData> {}

export const ModuleDataUpdate = Schema.Union([
  Schema.Struct({ module: Schema.Literal("audio"), data: AudioData }),
  Schema.Struct({ module: Schema.Literal("battery"), data: BatteryData }),
  Schema.Struct({ module: Schema.Literal("bluetooth"), data: BluetoothData }),
  Schema.Struct({ module: Schema.Literal("cpu"), data: CPUData }),
  Schema.Struct({ module: Schema.Literal("desktop"), data: DesktopData }),
  Schema.Struct({ module: Schema.Literal("discord"), data: DiscordData }),
  Schema.Struct({ module: Schema.Literal("disks"), data: DisksData }),
  Schema.Struct({ module: Schema.Literal("displays"), data: DisplaysData }),
  Schema.Struct({ module: Schema.Literal("gpus"), data: GPUsData }),
  Schema.Struct({ module: Schema.Literal("media"), data: MediaData }),
  Schema.Struct({ module: Schema.Literal("memory"), data: MemoryData }),
  Schema.Struct({ module: Schema.Literal("networks"), data: NetworksData }),
  Schema.Struct({ module: Schema.Literal("processes"), data: ProcessesData }),
  Schema.Struct({ module: Schema.Literal("sensors"), data: SensorsData }),
  Schema.Struct({ module: Schema.Literal("system"), data: SystemData }),
]);

export type ModuleDataUpdate = typeof ModuleDataUpdate.Type;
