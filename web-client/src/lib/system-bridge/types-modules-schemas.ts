import { Schema } from "effect";

// Auto-generated file. Do not edit manually.
// Generated from backend types in types/ directory

// RunMode enum
export const RunModeSchema = Schema.Literal("standalone");
export type RunMode = typeof RunModeSchema.Type;

// CPU Frequency
export const CPUFrequencySchema = Schema.Struct({
  current: Schema.NullishOr(Schema.Number),
  min: Schema.NullishOr(Schema.Number),
  max: Schema.NullishOr(Schema.Number),
});

export type CPUFrequency = typeof CPUFrequencySchema.Type;

// CPU Stats
export const CPUStatsSchema = Schema.Struct({
  ctx_switches: Schema.NullishOr(Schema.Number),
  interrupts: Schema.NullishOr(Schema.Number),
  soft_interrupts: Schema.NullishOr(Schema.Number),
  syscalls: Schema.NullishOr(Schema.Number),
});

export type CPUStats = typeof CPUStatsSchema.Type;

// CPU Times
export const CPUTimesSchema = Schema.Struct({
  user: Schema.NullishOr(Schema.Number),
  system: Schema.NullishOr(Schema.Number),
  idle: Schema.NullishOr(Schema.Number),
  interrupt: Schema.NullishOr(Schema.Number),
  dpc: Schema.NullishOr(Schema.Number),
});

export type CPUTimes = typeof CPUTimesSchema.Type;

// Disk IO Counters
export const DiskIOCountersSchema = Schema.Struct({
  read_count: Schema.Number,
  write_count: Schema.Number,
  read_bytes: Schema.Number,
  write_bytes: Schema.Number,
  read_time: Schema.Number,
  write_time: Schema.Number,
});

export type DiskIOCounters = typeof DiskIOCountersSchema.Type;

// Disk Usage
export const DiskUsageSchema = Schema.Struct({
  total: Schema.Number,
  used: Schema.Number,
  free: Schema.Number,
  percent: Schema.Number,
});

export type DiskUsage = typeof DiskUsageSchema.Type;

// Network Address
export const NetworkAddressSchema = Schema.Struct({
  address: Schema.NullishOr(Schema.String),
  family: Schema.NullishOr(Schema.String),
  netmask: Schema.NullishOr(Schema.String),
  broadcast: Schema.NullishOr(Schema.String),
  ptp: Schema.NullishOr(Schema.String),
});

export type NetworkAddress = typeof NetworkAddressSchema.Type;

// Network Stats
export const NetworkStatsSchema = Schema.Struct({
  isup: Schema.NullishOr(Schema.Boolean),
  duplex: Schema.NullishOr(Schema.String),
  speed: Schema.NullishOr(Schema.Number),
  mtu: Schema.NullishOr(Schema.Number),
  flags: Schema.Array(Schema.String),
});

export type NetworkStats = typeof NetworkStatsSchema.Type;

// Network IO
export const NetworkIOSchema = Schema.Struct({
  bytes_sent: Schema.NullishOr(Schema.Number),
  bytes_recv: Schema.NullishOr(Schema.Number),
  packets_sent: Schema.NullishOr(Schema.Number),
  packets_recv: Schema.NullishOr(Schema.Number),
  errin: Schema.NullishOr(Schema.Number),
  errout: Schema.NullishOr(Schema.Number),
  dropin: Schema.NullishOr(Schema.Number),
  dropout: Schema.NullishOr(Schema.Number),
});

export type NetworkIO = typeof NetworkIOSchema.Type;

// Temperature Sensor
export const TemperatureSchema = Schema.Struct({
  key: Schema.String,
  temperature: Schema.Number,
  high: Schema.Number,
  critical: Schema.Number,
});

export type Temperature = typeof TemperatureSchema.Type;

// System User
export const SystemUserSchema = Schema.Struct({
  name: Schema.String,
  active: Schema.Boolean,
  terminal: Schema.String,
  host: Schema.String,
  started: Schema.Number,
  pid: Schema.Number,
});

export type SystemUser = typeof SystemUserSchema.Type;

// Memory Swap
export const MemorySwapSchema = Schema.Struct({
  total: Schema.NullishOr(Schema.Number),
  used: Schema.NullishOr(Schema.Number),
  free: Schema.NullishOr(Schema.Number),
  percent: Schema.NullishOr(Schema.Number),
  sin: Schema.NullishOr(Schema.Number),
  sout: Schema.NullishOr(Schema.Number),
});

export type MemorySwap = typeof MemorySwapSchema.Type;

// Memory Virtual
export const MemoryVirtualSchema = Schema.Struct({
  total: Schema.NullishOr(Schema.Number),
  available: Schema.NullishOr(Schema.Number),
  percent: Schema.NullishOr(Schema.Number),
  used: Schema.NullishOr(Schema.Number),
  free: Schema.NullishOr(Schema.Number),
  active: Schema.NullishOr(Schema.Number),
  inactive: Schema.NullishOr(Schema.Number),
  buffers: Schema.NullishOr(Schema.Number),
  cached: Schema.NullishOr(Schema.Number),
  wired: Schema.NullishOr(Schema.Number),
  shared: Schema.NullishOr(Schema.Number),
});

export type MemoryVirtual = typeof MemoryVirtualSchema.Type;

// Per-CPU Data
export const PerCPUSchema = Schema.Struct({
  id: Schema.Number,
  frequency: Schema.NullishOr(CPUFrequencySchema),
  power: Schema.NullishOr(Schema.Number),
  times: Schema.NullishOr(CPUTimesSchema),
  times_percent: Schema.NullishOr(CPUTimesSchema),
  usage: Schema.NullishOr(Schema.Number),
  voltage: Schema.NullishOr(Schema.Number),
});

export type PerCPU = typeof PerCPUSchema.Type;

// Disk Partition
export const DiskPartitionSchema = Schema.Struct({
  device: Schema.String,
  mount_point: Schema.String,
  filesystem_type: Schema.String,
  options: Schema.String,
  max_file_size: Schema.Number,
  max_path_length: Schema.Number,
  usage: Schema.NullishOr(DiskUsageSchema),
});

export type DiskPartition = typeof DiskPartitionSchema.Type;

// Network Connection
export const NetworkConnectionSchema = Schema.Struct({
  fd: Schema.NullishOr(Schema.Number),
  family: Schema.NullishOr(Schema.Number),
  type: Schema.NullishOr(Schema.Number),
  laddr: Schema.NullishOr(Schema.String),
  raddr: Schema.NullishOr(Schema.String),
  status: Schema.NullishOr(Schema.String),
  pid: Schema.NullishOr(Schema.Number),
});

export type NetworkConnection = typeof NetworkConnectionSchema.Type;

// Windows Sensor
export const SensorsWindowsSensorSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  type: Schema.String,
  value: Schema.Unknown,
});

export type SensorsWindowsSensor = typeof SensorsWindowsSensorSchema.Type;

// NVIDIA Chipset
export const SensorsNVIDIAChipsetSchema = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  flags: Schema.String,
  vendor_id: Schema.Number,
  vendor_name: Schema.String,
});

export type SensorsNVIDIAChipset = typeof SensorsNVIDIAChipsetSchema.Type;

// NVIDIA Display
export const SensorsNVIDIADisplaySchema = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  active: Schema.Boolean,
  available: Schema.Boolean,
  connected: Schema.Boolean,
  dynamic: Schema.Boolean,
  aspect_horizontal: Schema.Number,
  aspect_vertical: Schema.Number,
  brightness_current: Schema.Number,
  brightness_default: Schema.Number,
  brightness_max: Schema.Number,
  brightness_min: Schema.Number,
  color_depth: Schema.String,
  connection_type: Schema.String,
  pixel_clock: Schema.Number,
  refresh_rate: Schema.Number,
  resolution_horizontal: Schema.Number,
  resolution_vertical: Schema.Number,
});

export type SensorsNVIDIADisplay = typeof SensorsNVIDIADisplaySchema.Type;

// NVIDIA Driver
export const SensorsNVIDIADriverSchema = Schema.Struct({
  branch_version: Schema.String,
  interface_version: Schema.String,
  version: Schema.Number,
});

export type SensorsNVIDIADriver = typeof SensorsNVIDIADriverSchema.Type;

// NVIDIA GPU
export const SensorsNVIDIAGPUSchema = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  bios_oem_revision: Schema.NullishOr(Schema.Number),
  bios_revision: Schema.NullishOr(Schema.Number),
  bios_version: Schema.NullishOr(Schema.String),
  current_fan_speed_level: Schema.NullishOr(Schema.Number),
  current_fan_speed_rpm: Schema.NullishOr(Schema.Number),
  driver_model: Schema.NullishOr(Schema.Number),
  memory_available: Schema.NullishOr(Schema.Number),
  memory_capacity: Schema.NullishOr(Schema.Number),
  memory_maker: Schema.NullishOr(Schema.String),
  serial: Schema.NullishOr(Schema.String),
  system_type: Schema.NullishOr(Schema.String),
  type: Schema.NullishOr(Schema.String),
});

export type SensorsNVIDIAGPU = typeof SensorsNVIDIAGPUSchema.Type;

// Disk
export const DiskSchema = Schema.Struct({
  name: Schema.String,
  partitions: Schema.Array(DiskPartitionSchema),
  io_counters: Schema.NullishOr(DiskIOCountersSchema),
});

export type Disk = typeof DiskSchema.Type;

// Display
export const DisplaySchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  resolution_horizontal: Schema.Number,
  resolution_vertical: Schema.Number,
  x: Schema.Number,
  y: Schema.Number,
  width: Schema.NullishOr(Schema.Number),
  height: Schema.NullishOr(Schema.Number),
  is_primary: Schema.NullishOr(Schema.Boolean),
  pixel_clock: Schema.NullishOr(Schema.Number),
  refresh_rate: Schema.NullishOr(Schema.Number),
});

export type Display = typeof DisplaySchema.Type;

// GPU
export const GPUSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  core_clock: Schema.NullishOr(Schema.Number),
  core_load: Schema.NullishOr(Schema.Number),
  fan_speed: Schema.NullishOr(Schema.Number),
  memory_clock: Schema.NullishOr(Schema.Number),
  memory_load: Schema.NullishOr(Schema.Number),
  memory_free: Schema.NullishOr(Schema.Number),
  memory_used: Schema.NullishOr(Schema.Number),
  memory_total: Schema.NullishOr(Schema.Number),
  power_usage: Schema.NullishOr(Schema.Number),
  temperature: Schema.NullishOr(Schema.Number),
});

export type GPU = typeof GPUSchema.Type;

// Network
export const NetworkSchema = Schema.Struct({
  name: Schema.NullishOr(Schema.String),
  addresses: Schema.Array(NetworkAddressSchema),
  stats: Schema.NullishOr(NetworkStatsSchema),
});

export type Network = typeof NetworkSchema.Type;

// Process
export const ProcessSchema = Schema.Struct({
  id: Schema.Number,
  name: Schema.NullishOr(Schema.String),
  cpu_usage: Schema.NullishOr(Schema.Number),
  created: Schema.NullishOr(Schema.Number),
  memory_usage: Schema.NullishOr(Schema.Number),
  path: Schema.NullishOr(Schema.String),
  status: Schema.NullishOr(Schema.String),
  username: Schema.NullishOr(Schema.String),
  working_directory: Schema.NullishOr(Schema.String),
});

export type Process = typeof ProcessSchema.Type;

// NVIDIA Sensors
export const SensorsNVIDIASchema = Schema.Struct({
  chipset: Schema.NullishOr(SensorsNVIDIAChipsetSchema),
  displays: Schema.Array(SensorsNVIDIADisplaySchema),
  driver: Schema.NullishOr(SensorsNVIDIADriverSchema),
  gpus: Schema.Array(SensorsNVIDIAGPUSchema),
});

export type SensorsNVIDIA = typeof SensorsNVIDIASchema.Type;

// Windows Hardware
export interface SensorsWindowsHardware {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly subhardware: readonly SensorsWindowsHardware[];
  readonly sensors: readonly SensorsWindowsSensor[];
}

export const SensorsWindowsHardwareSchema: Schema.Schema<SensorsWindowsHardware> =
  Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    type: Schema.String,
    subhardware: Schema.Array(
      Schema.suspend(
        (): Schema.Schema<SensorsWindowsHardware> =>
          SensorsWindowsHardwareSchema,
      ),
    ),
    sensors: Schema.Array(SensorsWindowsSensorSchema),
  });

// Windows Sensors
export const SensorsWindowsSchema = Schema.Struct({
  hardware: Schema.Array(SensorsWindowsHardwareSchema),
  nvidia: Schema.NullishOr(SensorsNVIDIASchema),
});

export type SensorsWindows = typeof SensorsWindowsSchema.Type;

// Battery Module
export const BatteryDataSchema = Schema.Struct({
  is_charging: Schema.NullishOr(Schema.Boolean),
  percentage: Schema.NullishOr(Schema.Number),
  time_remaining: Schema.NullishOr(Schema.Number),
});

export type BatteryData = typeof BatteryDataSchema.Type;

// CPU Module
export const CPUDataSchema = Schema.Struct({
  count: Schema.NullishOr(Schema.Number),
  frequency: Schema.NullishOr(CPUFrequencySchema),
  load_average: Schema.NullishOr(Schema.Number),
  per_cpu: Schema.Array(Schema.Unknown),
  power: Schema.NullishOr(Schema.Number),
  stats: Schema.NullishOr(CPUStatsSchema),
  temperature: Schema.NullishOr(Schema.Number),
  times: Schema.NullishOr(CPUTimesSchema),
  times_percent: Schema.NullishOr(CPUTimesSchema),
  usage: Schema.NullishOr(Schema.Number),
  voltage: Schema.NullishOr(Schema.Number),
});

export type CPUData = typeof CPUDataSchema.Type;

// Disks Module
export const DisksDataSchema = Schema.Struct({
  devices: Schema.Array(DiskSchema),
  io_counters: Schema.NullishOr(DiskIOCountersSchema),
});

export type DisksData = typeof DisksDataSchema.Type;

// Displays Module
export const DisplaysDataSchema = Schema.Array(DisplaySchema);

export type DisplaysData = typeof DisplaysDataSchema.Type;

// GPUs Module
export const GPUsDataSchema = Schema.Array(GPUSchema);

export type GPUsData = typeof GPUsDataSchema.Type;

// Media Module
export const MediaDataSchema = Schema.Struct({
  album_artist: Schema.NullishOr(Schema.String),
  album_title: Schema.NullishOr(Schema.String),
  artist: Schema.NullishOr(Schema.String),
  duration: Schema.NullishOr(Schema.Number),
  is_fast_forward_enabled: Schema.NullishOr(Schema.Boolean),
  is_next_enabled: Schema.NullishOr(Schema.Boolean),
  is_pause_enabled: Schema.NullishOr(Schema.Boolean),
  is_play_enabled: Schema.NullishOr(Schema.Boolean),
  is_previous_enabled: Schema.NullishOr(Schema.Boolean),
  is_rewind_enabled: Schema.NullishOr(Schema.Boolean),
  is_stop_enabled: Schema.NullishOr(Schema.Boolean),
  playback_rate: Schema.NullishOr(Schema.Number),
  position: Schema.NullishOr(Schema.Number),
  repeat: Schema.NullishOr(Schema.String),
  shuffle: Schema.NullishOr(Schema.Boolean),
  status: Schema.NullishOr(Schema.String),
  subtitle: Schema.NullishOr(Schema.String),
  thumbnail: Schema.NullishOr(Schema.String),
  title: Schema.NullishOr(Schema.String),
  track_number: Schema.NullishOr(Schema.Number),
  type: Schema.NullishOr(Schema.String),
  updated_at: Schema.NullishOr(Schema.Number),
  volume: Schema.NullishOr(Schema.Number),
});

export type MediaData = typeof MediaDataSchema.Type;

// Memory Module
export const MemoryDataSchema = Schema.Struct({
  swap: Schema.NullishOr(MemorySwapSchema),
  virtual: Schema.NullishOr(MemoryVirtualSchema),
});

export type MemoryData = typeof MemoryDataSchema.Type;

// Networks Module
export const NetworksDataSchema = Schema.Struct({
  connections: Schema.Array(NetworkConnectionSchema),
  io: Schema.NullishOr(NetworkIOSchema),
  networks: Schema.Array(NetworkSchema),
});

export type NetworksData = typeof NetworksDataSchema.Type;

// Processes Module
export const ProcessesDataSchema = Schema.Array(ProcessSchema);

export type ProcessesData = typeof ProcessesDataSchema.Type;

// Sensors Module
export const SensorsDataSchema = Schema.Struct({
  fans: Schema.Unknown,
  temperatures: Schema.Array(TemperatureSchema),
  windows_sensors: Schema.NullishOr(SensorsWindowsSchema),
});

export type SensorsData = typeof SensorsDataSchema.Type;

// System Module
export const SystemDataSchema = Schema.Struct({
  boot_time: Schema.Number,
  fqdn: Schema.String,
  hostname: Schema.String,
  kernel_version: Schema.String,
  ip_address_4: Schema.String,
  mac_address: Schema.String,
  platform_version: Schema.String,
  platform: Schema.String,
  power_usage: Schema.NullishOr(Schema.Number),
  uptime: Schema.Number,
  users: Schema.Array(SystemUserSchema),
  uuid: Schema.String,
  version: Schema.String,
  camera_usage: Schema.Array(Schema.String),
  ip_address_6: Schema.String,
  pending_reboot: Schema.NullishOr(Schema.Boolean),
  run_mode: Schema.Literal("standalone"),
  version_latest_url: Schema.NullishOr(Schema.String),
  version_latest: Schema.NullishOr(Schema.String),
  version_newer_available: Schema.NullishOr(Schema.Boolean),
});

export type SystemData = typeof SystemDataSchema.Type;

// Module
export const ModuleSchema = Schema.Struct({
  module: Schema.Unknown,
  data: Schema.Unknown,
  updated: Schema.String,
});

export type Module = typeof ModuleSchema.Type;

// Module Data Union Type
export const ModuleDataSchemas = {
  battery: BatteryDataSchema,
  cpu: CPUDataSchema,
  disks: DisksDataSchema,
  displays: DisplaysDataSchema,
  gpus: GPUsDataSchema,
  media: MediaDataSchema,
  memory: MemoryDataSchema,
  networks: NetworksDataSchema,
  processes: ProcessesDataSchema,
  sensors: SensorsDataSchema,
  system: SystemDataSchema,
} as const;
