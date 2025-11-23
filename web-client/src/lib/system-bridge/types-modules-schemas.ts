import { z } from "zod";

// Auto-generated file. Do not edit manually.
// Generated from backend types in types/ directory

// RunMode enum
export const RunModeSchema = z.enum(["standalone"]);
export type RunMode = z.infer<typeof RunModeSchema>;

// CPU Frequency
export const CPUFrequencySchema = z.object({
  current: z.number().nullish(),
  min: z.number().nullish(),
  max: z.number().nullish(),
});

export type CPUFrequency = z.infer<typeof CPUFrequencySchema>;

// CPU Stats
export const CPUStatsSchema = z.object({
  ctx_switches: z.number().nullish(),
  interrupts: z.number().nullish(),
  soft_interrupts: z.number().nullish(),
  syscalls: z.number().nullish(),
});

export type CPUStats = z.infer<typeof CPUStatsSchema>;

// CPU Times
export const CPUTimesSchema = z.object({
  user: z.number().nullish(),
  system: z.number().nullish(),
  idle: z.number().nullish(),
  interrupt: z.number().nullish(),
  dpc: z.number().nullish(),
});

export type CPUTimes = z.infer<typeof CPUTimesSchema>;

// Disk IO Counters
export const DiskIOCountersSchema = z.object({
  read_count: z.number(),
  write_count: z.number(),
  read_bytes: z.number(),
  write_bytes: z.number(),
  read_time: z.number(),
  write_time: z.number(),
});

export type DiskIOCounters = z.infer<typeof DiskIOCountersSchema>;

// Disk Usage
export const DiskUsageSchema = z.object({
  total: z.number(),
  used: z.number(),
  free: z.number(),
  percent: z.number(),
});

export type DiskUsage = z.infer<typeof DiskUsageSchema>;

// Network Address
export const NetworkAddressSchema = z.object({
  address: z.string().nullish(),
  family: z.string().nullish(),
  netmask: z.string().nullish(),
  broadcast: z.string().nullish(),
  ptp: z.string().nullish(),
});

export type NetworkAddress = z.infer<typeof NetworkAddressSchema>;

// Network Stats
export const NetworkStatsSchema = z.object({
  isup: z.boolean().nullish(),
  duplex: z.string().nullish(),
  speed: z.number().nullish(),
  mtu: z.number().nullish(),
  flags: z.array(z.string()),
});

export type NetworkStats = z.infer<typeof NetworkStatsSchema>;

// Network IO
export const NetworkIOSchema = z.object({
  bytes_sent: z.number().nullish(),
  bytes_recv: z.number().nullish(),
  packets_sent: z.number().nullish(),
  packets_recv: z.number().nullish(),
  errin: z.number().nullish(),
  errout: z.number().nullish(),
  dropin: z.number().nullish(),
  dropout: z.number().nullish(),
});

export type NetworkIO = z.infer<typeof NetworkIOSchema>;

// Temperature Sensor
export const TemperatureSchema = z.object({
  key: z.string(),
  temperature: z.number(),
  high: z.number(),
  critical: z.number(),
});

export type Temperature = z.infer<typeof TemperatureSchema>;

// System User
export const SystemUserSchema = z.object({
  name: z.string(),
  active: z.boolean(),
  terminal: z.string(),
  host: z.string(),
  started: z.number(),
  pid: z.number(),
});

export type SystemUser = z.infer<typeof SystemUserSchema>;

// Memory Swap
export const MemorySwapSchema = z.object({
  total: z.number().nullish(),
  used: z.number().nullish(),
  free: z.number().nullish(),
  percent: z.number().nullish(),
  sin: z.number().nullish(),
  sout: z.number().nullish(),
});

export type MemorySwap = z.infer<typeof MemorySwapSchema>;

// Memory Virtual
export const MemoryVirtualSchema = z.object({
  total: z.number().nullish(),
  available: z.number().nullish(),
  percent: z.number().nullish(),
  used: z.number().nullish(),
  free: z.number().nullish(),
  active: z.number().nullish(),
  inactive: z.number().nullish(),
  buffers: z.number().nullish(),
  cached: z.number().nullish(),
  wired: z.number().nullish(),
  shared: z.number().nullish(),
});

export type MemoryVirtual = z.infer<typeof MemoryVirtualSchema>;

// Per-CPU Data
export const PerCPUSchema = z.object({
  id: z.number(),
  frequency: CPUFrequencySchema.nullish(),
  power: z.number().nullish(),
  times: CPUTimesSchema.nullish(),
  times_percent: CPUTimesSchema.nullish(),
  usage: z.number().nullish(),
  voltage: z.number().nullish(),
});

export type PerCPU = z.infer<typeof PerCPUSchema>;

// Disk Partition
export const DiskPartitionSchema = z.object({
  device: z.string(),
  mount_point: z.string(),
  filesystem_type: z.string(),
  options: z.string(),
  max_file_size: z.number(),
  max_path_length: z.number(),
  usage: DiskUsageSchema.nullish(),
});

export type DiskPartition = z.infer<typeof DiskPartitionSchema>;

// Network Connection
export const NetworkConnectionSchema = z.object({
  fd: z.number().nullish(),
  family: z.number().nullish(),
  type: z.number().nullish(),
  laddr: z.string().nullish(),
  raddr: z.string().nullish(),
  status: z.string().nullish(),
  pid: z.number().nullish(),
});

export type NetworkConnection = z.infer<typeof NetworkConnectionSchema>;

// Windows Sensor
export const SensorsWindowsSensorSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  value: z.unknown(),
});

export type SensorsWindowsSensor = z.infer<typeof SensorsWindowsSensorSchema>;

// NVIDIA Chipset
export const SensorsNVIDIAChipsetSchema = z.object({
  id: z.number(),
  name: z.string(),
  flags: z.string(),
  vendor_id: z.number(),
  vendor_name: z.string(),
});

export type SensorsNVIDIAChipset = z.infer<typeof SensorsNVIDIAChipsetSchema>;

// NVIDIA Display
export const SensorsNVIDIADisplaySchema = z.object({
  id: z.number(),
  name: z.string(),
  active: z.boolean(),
  available: z.boolean(),
  connected: z.boolean(),
  dynamic: z.boolean(),
  aspect_horizontal: z.number(),
  aspect_vertical: z.number(),
  brightness_current: z.number(),
  brightness_default: z.number(),
  brightness_max: z.number(),
  brightness_min: z.number(),
  color_depth: z.string(),
  connection_type: z.string(),
  pixel_clock: z.number(),
  refresh_rate: z.number(),
  resolution_horizontal: z.number(),
  resolution_vertical: z.number(),
});

export type SensorsNVIDIADisplay = z.infer<typeof SensorsNVIDIADisplaySchema>;

// NVIDIA Driver
export const SensorsNVIDIADriverSchema = z.object({
  branch_version: z.string(),
  interface_version: z.string(),
  version: z.number(),
});

export type SensorsNVIDIADriver = z.infer<typeof SensorsNVIDIADriverSchema>;

// NVIDIA GPU
export const SensorsNVIDIAGPUSchema = z.object({
  id: z.number(),
  name: z.string(),
  bios_oem_revision: z.number().nullish(),
  bios_revision: z.number().nullish(),
  bios_version: z.string().nullish(),
  current_fan_speed_level: z.number().nullish(),
  current_fan_speed_rpm: z.number().nullish(),
  driver_model: z.number().nullish(),
  memory_available: z.number().nullish(),
  memory_capacity: z.number().nullish(),
  memory_maker: z.string().nullish(),
  serial: z.string().nullish(),
  system_type: z.string().nullish(),
  type: z.string().nullish(),
});

export type SensorsNVIDIAGPU = z.infer<typeof SensorsNVIDIAGPUSchema>;

// Disk
export const DiskSchema = z.object({
  name: z.string(),
  partitions: z.array(DiskPartitionSchema),
  io_counters: DiskIOCountersSchema.nullish(),
});

export type Disk = z.infer<typeof DiskSchema>;

// Display
export const DisplaySchema = z.object({
  id: z.string(),
  name: z.string(),
  resolution_horizontal: z.number(),
  resolution_vertical: z.number(),
  x: z.number(),
  y: z.number(),
  width: z.number().nullish(),
  height: z.number().nullish(),
  is_primary: z.boolean().nullish(),
  pixel_clock: z.number().nullish(),
  refresh_rate: z.number().nullish(),
});

export type Display = z.infer<typeof DisplaySchema>;

// GPU
export const GPUSchema = z.object({
  id: z.string(),
  name: z.string(),
  core_clock: z.number().nullish(),
  core_load: z.number().nullish(),
  fan_speed: z.number().nullish(),
  memory_clock: z.number().nullish(),
  memory_load: z.number().nullish(),
  memory_free: z.number().nullish(),
  memory_used: z.number().nullish(),
  memory_total: z.number().nullish(),
  power_usage: z.number().nullish(),
  temperature: z.number().nullish(),
});

export type GPU = z.infer<typeof GPUSchema>;

// Network
export const NetworkSchema = z.object({
  name: z.string().nullish(),
  addresses: z.array(NetworkAddressSchema),
  stats: NetworkStatsSchema.nullish(),
});

export type Network = z.infer<typeof NetworkSchema>;

// Process
export const ProcessSchema = z.object({
  id: z.number(),
  name: z.string().nullish(),
  cpu_usage: z.number().nullish(),
  created: z.number().nullish(),
  memory_usage: z.number().nullish(),
  path: z.string().nullish(),
  status: z.string().nullish(),
  username: z.string().nullish(),
  working_directory: z.string().nullish(),
});

export type Process = z.infer<typeof ProcessSchema>;

// NVIDIA Sensors
export const SensorsNVIDIASchema = z.object({
  chipset: SensorsNVIDIAChipsetSchema.nullish(),
  displays: z.array(SensorsNVIDIADisplaySchema),
  driver: SensorsNVIDIADriverSchema.nullish(),
  gpus: z.array(SensorsNVIDIAGPUSchema),
});

export type SensorsNVIDIA = z.infer<typeof SensorsNVIDIASchema>;

// Windows Hardware
export const SensorsWindowsHardwareSchema: z.ZodType<{
  id: string;
  name: string;
  type: string;
  subhardware: unknown[];
  sensors: {
    id: string;
    name: string;
    type: string;
    value: unknown;
  }[];
}> = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  subhardware: z.array(z.lazy(() => SensorsWindowsHardwareSchema)),
  sensors: z.array(SensorsWindowsSensorSchema),
});

export type SensorsWindowsHardware = z.infer<
  typeof SensorsWindowsHardwareSchema
>;

// Windows Sensors
export const SensorsWindowsSchema = z.object({
  hardware: z.array(SensorsWindowsHardwareSchema),
  nvidia: SensorsNVIDIASchema.nullish(),
});

export type SensorsWindows = z.infer<typeof SensorsWindowsSchema>;

// Battery Module
export const BatteryDataSchema = z.object({
  is_charging: z.boolean().nullish(),
  percentage: z.number().nullish(),
  time_remaining: z.number().nullish(),
});

export type BatteryData = z.infer<typeof BatteryDataSchema>;

// CPU Module
export const CPUDataSchema = z.object({
  count: z.number().nullish(),
  frequency: CPUFrequencySchema.nullish(),
  load_average: z.number().nullish(),
  per_cpu: z.array(z.unknown()),
  power: z.number().nullish(),
  stats: CPUStatsSchema.nullish(),
  temperature: z.number().nullish(),
  times: CPUTimesSchema.nullish(),
  times_percent: CPUTimesSchema.nullish(),
  usage: z.number().nullish(),
  voltage: z.number().nullish(),
});

export type CPUData = z.infer<typeof CPUDataSchema>;

// Disks Module
export const DisksDataSchema = z.object({
  devices: z.array(DiskSchema),
  io_counters: DiskIOCountersSchema.nullish(),
});

export type DisksData = z.infer<typeof DisksDataSchema>;

// Displays Module
export const DisplaysDataSchema = z.array(DisplaySchema);

export type DisplaysData = z.infer<typeof DisplaysDataSchema>;

// GPUs Module
export const GPUsDataSchema = z.array(GPUSchema);

export type GPUsData = z.infer<typeof GPUsDataSchema>;

// Media Module
export const MediaDataSchema = z.object({
  album_artist: z.string().nullish(),
  album_title: z.string().nullish(),
  artist: z.string().nullish(),
  duration: z.number().nullish(),
  is_fast_forward_enabled: z.boolean().nullish(),
  is_next_enabled: z.boolean().nullish(),
  is_pause_enabled: z.boolean().nullish(),
  is_play_enabled: z.boolean().nullish(),
  is_previous_enabled: z.boolean().nullish(),
  is_rewind_enabled: z.boolean().nullish(),
  is_stop_enabled: z.boolean().nullish(),
  playback_rate: z.number().nullish(),
  position: z.number().nullish(),
  repeat: z.string().nullish(),
  shuffle: z.boolean().nullish(),
  status: z.string().nullish(),
  subtitle: z.string().nullish(),
  thumbnail: z.string().nullish(),
  title: z.string().nullish(),
  track_number: z.number().nullish(),
  type: z.string().nullish(),
  updated_at: z.number().nullish(),
  volume: z.number().nullish(),
});

export type MediaData = z.infer<typeof MediaDataSchema>;

// Memory Module
export const MemoryDataSchema = z.object({
  swap: MemorySwapSchema.nullish(),
  virtual: MemoryVirtualSchema.nullish(),
});

export type MemoryData = z.infer<typeof MemoryDataSchema>;

// Networks Module
export const NetworksDataSchema = z.object({
  connections: z.array(NetworkConnectionSchema),
  io: NetworkIOSchema.nullish(),
  networks: z.array(NetworkSchema),
});

export type NetworksData = z.infer<typeof NetworksDataSchema>;

// Processes Module
export const ProcessesDataSchema = z.array(ProcessSchema);

export type ProcessesData = z.infer<typeof ProcessesDataSchema>;

// Sensors Module
export const SensorsDataSchema = z.object({
  fans: z.unknown(),
  temperatures: z.array(TemperatureSchema),
  windows_sensors: SensorsWindowsSchema.nullish(),
});

export type SensorsData = z.infer<typeof SensorsDataSchema>;

// System Module
export const SystemDataSchema = z.object({
  boot_time: z.number(),
  fqdn: z.string(),
  hostname: z.string(),
  kernel_version: z.string(),
  ip_address_4: z.string(),
  mac_address: z.string(),
  platform_version: z.string(),
  platform: z.string(),
  power_usage: z.number().nullish(),
  uptime: z.number(),
  users: z.array(SystemUserSchema),
  uuid: z.string(),
  version: z.string(),
  camera_usage: z.array(z.string()),
  ip_address_6: z.string(),
  pending_reboot: z.boolean().nullish(),
  run_mode: z.enum(["standalone"]),
  version_latest_url: z.string().nullish(),
  version_latest: z.string().nullish(),
  version_newer_available: z.boolean().nullish(),
});

export type SystemData = z.infer<typeof SystemDataSchema>;

// Module
export const ModuleSchema = z.object({
  module: z.unknown(),
  data: z.unknown(),
  updated: z.string(),
});

export type Module = z.infer<typeof ModuleSchema>;

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
