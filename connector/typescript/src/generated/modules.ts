// Auto-generated file. Do not edit manually.
// Generated from backend types in types/ directory

import { Schema } from "effect";

export const DiskMountCategory = Schema.Literals([
  "primary",
  "bind",
  "squashfs",
]);
export type DiskMountCategory = typeof DiskMountCategory.Type;

export const ModuleName = Schema.Literals([
  "battery",
  "cpu",
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

export const RunMode = Schema.Literals(["standalone"]);
export type RunMode = typeof RunMode.Type;

export const BatteryData = Schema.Struct({
  is_charging: Schema.NullOr(Schema.Boolean),
  percentage: Schema.NullOr(Schema.Finite),
  time_remaining: Schema.NullOr(Schema.Finite),
});
export interface BatteryData extends Schema.Schema.Type<typeof BatteryData> {}

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

export const DiscordCallMember = Schema.Struct({
  nick: Schema.NullOr(Schema.String),
  server_mute: Schema.Boolean,
  server_deaf: Schema.Boolean,
  suppress: Schema.Boolean,
  speaking: Schema.Boolean,
});
export interface DiscordCallMember extends Schema.Schema.Type<
  typeof DiscordCallMember
> {}

export const DiscordCall = Schema.Struct({
  channel: DiscordChannel,
  server: Schema.NullOr(DiscordServer),
  connection: Schema.NullOr(DiscordVoiceConnection),
  me: Schema.NullOr(DiscordCallMember),
});
export interface DiscordCall extends Schema.Schema.Type<typeof DiscordCall> {}

export const DiscordUser = Schema.Struct({
  id: Schema.String,
  username: Schema.String,
  global_name: Schema.NullOr(Schema.String),
  avatar_url: Schema.NullOr(Schema.String),
});
export interface DiscordUser extends Schema.Schema.Type<typeof DiscordUser> {}

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
  x: Schema.Finite,
  y: Schema.Finite,
  width: Schema.NullOr(Schema.Finite),
  height: Schema.NullOr(Schema.Finite),
  is_primary: Schema.NullOr(Schema.Boolean),
  pixel_clock: Schema.NullOr(Schema.Finite),
  refresh_rate: Schema.NullOr(Schema.Finite),
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
  fan_speed: Schema.NullOr(Schema.Finite),
  memory_clock: Schema.NullOr(Schema.Finite),
  memory_load: Schema.NullOr(Schema.Finite),
  memory_free: Schema.NullOr(Schema.Finite),
  memory_used: Schema.NullOr(Schema.Finite),
  memory_total: Schema.NullOr(Schema.Finite),
  power_usage: Schema.NullOr(Schema.Finite),
  temperature: Schema.NullOr(Schema.Finite),
});
export interface GPU extends Schema.Schema.Type<typeof GPU> {}

export const GPUsData = Schema.Array(GPU);
export type GPUsData = typeof GPUsData.Type;

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
  is_stop_enabled: Schema.NullOr(Schema.Boolean),
  playback_rate: Schema.NullOr(Schema.Finite),
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

export const Network = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  addresses: Schema.Array(NetworkAddress),
  stats: Schema.NullOr(NetworkStats),
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

export const NetworkIO = Schema.Struct({
  bytes_sent: Schema.NullOr(Schema.Finite),
  bytes_recv: Schema.NullOr(Schema.Finite),
  packets_sent: Schema.NullOr(Schema.Finite),
  packets_recv: Schema.NullOr(Schema.Finite),
  errin: Schema.NullOr(Schema.Finite),
  errout: Schema.NullOr(Schema.Finite),
  dropin: Schema.NullOr(Schema.Finite),
  dropout: Schema.NullOr(Schema.Finite),
});
export interface NetworkIO extends Schema.Schema.Type<typeof NetworkIO> {}

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
  run_mode: RunMode,
  version_latest_url: Schema.NullOr(Schema.String),
  version_latest: Schema.NullOr(Schema.String),
  version_newer_available: Schema.NullOr(Schema.Boolean),
  device_info: Schema.NullOr(DeviceInfo),
});
export interface SystemData extends Schema.Schema.Type<typeof SystemData> {}

export const ModuleDataSchemas = {
  battery: BatteryData,
  cpu: CPUData,
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
} as const;

export type ModuleData = {
  readonly [
    K in keyof typeof ModuleDataSchemas
  ]: (typeof ModuleDataSchemas)[K]["Type"];
};
