import { z } from "zod";

// Auto-generated file. Do not edit manually.
// Generated from backend types in types/ directory

// RunMode enum
export const RunModeSchema = z.enum(["standalone"]);
export type RunMode = z.infer<typeof RunModeSchema>;

// CPU Frequency
export const CPUFrequencySchema = z.object({
  current: z.number().nullable(),
  min: z.number().nullable(),
  max: z.number().nullable(),
});

export type CPUFrequency = z.infer<typeof CPUFrequencySchema>;

// CPU Stats
export const CPUStatsSchema = z.object({
  ctx_switches: z.number().nullable(),
  interrupts: z.number().nullable(),
  soft_interrupts: z.number().nullable(),
  syscalls: z.number().nullable(),
});

export type CPUStats = z.infer<typeof CPUStatsSchema>;

// CPU Times
export const CPUTimesSchema = z.object({
  user: z.number().nullable(),
  system: z.number().nullable(),
  idle: z.number().nullable(),
  interrupt: z.number().nullable(),
  dpc: z.number().nullable(),
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
  address: z.string().nullable(),
  family: z.string().nullable(),
  netmask: z.string().nullable(),
  broadcast: z.string().nullable(),
  ptp: z.string().nullable(),
});

export type NetworkAddress = z.infer<typeof NetworkAddressSchema>;

// Network Stats
export const NetworkStatsSchema = z.object({
  isup: z.boolean().nullable(),
  duplex: z.string().nullable(),
  speed: z.number().nullable(),
  mtu: z.number().nullable(),
  flags: z.array(z.string()),
});

export type NetworkStats = z.infer<typeof NetworkStatsSchema>;

// Network IO
export const NetworkIOSchema = z.object({
  bytes_sent: z.number().nullable(),
  bytes_recv: z.number().nullable(),
  packets_sent: z.number().nullable(),
  packets_recv: z.number().nullable(),
  errin: z.number().nullable(),
  errout: z.number().nullable(),
  dropin: z.number().nullable(),
  dropout: z.number().nullable(),
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
  total: z.number().nullable(),
  used: z.number().nullable(),
  free: z.number().nullable(),
  percent: z.number().nullable(),
  sin: z.number().nullable(),
  sout: z.number().nullable(),
});

export type MemorySwap = z.infer<typeof MemorySwapSchema>;

// Memory Virtual
export const MemoryVirtualSchema = z.object({
  total: z.number().nullable(),
  available: z.number().nullable(),
  percent: z.number().nullable(),
  used: z.number().nullable(),
  free: z.number().nullable(),
  active: z.number().nullable(),
  inactive: z.number().nullable(),
  buffers: z.number().nullable(),
  cached: z.number().nullable(),
  wired: z.number().nullable(),
  shared: z.number().nullable(),
});

export type MemoryVirtual = z.infer<typeof MemoryVirtualSchema>;

// Per-CPU Data
export const PerCPUSchema = z.object({
  id: z.number(),
  frequency: CPUFrequencySchema.nullable(),
  power: z.number().nullable(),
  times: CPUTimesSchema.nullable(),
  times_percent: CPUTimesSchema.nullable(),
  usage: z.number().nullable(),
  voltage: z.number().nullable(),
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
  usage: DiskUsageSchema.nullable(),
});

export type DiskPartition = z.infer<typeof DiskPartitionSchema>;

// Network Connection
export const NetworkConnectionSchema = z.object({
  fd: z.number().nullable(),
  family: z.number().nullable(),
  type: z.number().nullable(),
  laddr: z.string().nullable(),
  raddr: z.string().nullable(),
  status: z.string().nullable(),
  pid: z.number().nullable(),
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
  bios_oem_revision: z.number().nullable(),
  bios_revision: z.number().nullable(),
  bios_version: z.string().nullable(),
  current_fan_speed_level: z.number().nullable(),
  current_fan_speed_rpm: z.number().nullable(),
  driver_model: z.number().nullable(),
  memory_available: z.number().nullable(),
  memory_capacity: z.number().nullable(),
  memory_maker: z.string().nullable(),
  serial: z.string().nullable(),
  system_type: z.string().nullable(),
  type: z.string().nullable(),
});

export type SensorsNVIDIAGPU = z.infer<typeof SensorsNVIDIAGPUSchema>;

// Disk
export const DiskSchema = z.object({
  name: z.string(),
  partitions: z.array(DiskPartitionSchema),
  io_counters: DiskIOCountersSchema.nullable(),
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
  width: z.number().nullable(),
  height: z.number().nullable(),
  is_primary: z.boolean().nullable(),
  pixel_clock: z.number().nullable(),
  refresh_rate: z.number().nullable(),
});

export type Display = z.infer<typeof DisplaySchema>;

// GPU
export const GPUSchema = z.object({
  id: z.string(),
  name: z.string(),
  core_clock: z.number().nullable(),
  core_load: z.number().nullable(),
  fan_speed: z.number().nullable(),
  memory_clock: z.number().nullable(),
  memory_load: z.number().nullable(),
  memory_free: z.number().nullable(),
  memory_used: z.number().nullable(),
  memory_total: z.number().nullable(),
  power_usage: z.number().nullable(),
  temperature: z.number().nullable(),
});

export type GPU = z.infer<typeof GPUSchema>;

// Network
export const NetworkSchema = z.object({
  name: z.string().nullable(),
  addresses: z.array(NetworkAddressSchema),
  stats: NetworkStatsSchema.nullable(),
});

export type Network = z.infer<typeof NetworkSchema>;

// Process
export const ProcessSchema = z.object({
  id: z.number(),
  name: z.string().nullable(),
  cpu_usage: z.number().nullable(),
  created: z.number().nullable(),
  memory_usage: z.number().nullable(),
  path: z.string().nullable(),
  status: z.string().nullable(),
  username: z.string().nullable(),
  working_directory: z.string().nullable(),
});

export type Process = z.infer<typeof ProcessSchema>;

// NVIDIA Sensors
export const SensorsNVIDIASchema = z.object({
  chipset: SensorsNVIDIAChipsetSchema.nullable(),
  displays: z.array(SensorsNVIDIADisplaySchema),
  driver: SensorsNVIDIADriverSchema.nullable(),
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
  nvidia: SensorsNVIDIASchema.nullable(),
});

export type SensorsWindows = z.infer<typeof SensorsWindowsSchema>;

// Battery Module
export const BatteryDataSchema = z.object({
  is_charging: z.boolean().nullable(),
  percentage: z.number().nullable(),
  time_remaining: z.number().nullable(),
});

export type BatteryData = z.infer<typeof BatteryDataSchema>;

// CPU Module
export const CPUDataSchema = z.object({
  count: z.number().nullable(),
  frequency: CPUFrequencySchema.nullable(),
  load_average: z.number().nullable(),
  per_cpu: z.array(z.unknown()),
  power: z.number().nullable(),
  stats: CPUStatsSchema.nullable(),
  temperature: z.number().nullable(),
  times: CPUTimesSchema.nullable(),
  times_percent: CPUTimesSchema.nullable(),
  usage: z.number().nullable(),
  voltage: z.number().nullable(),
});

export type CPUData = z.infer<typeof CPUDataSchema>;

// Disks Module
export const DisksDataSchema = z.object({
  devices: z.array(DiskSchema),
  io_counters: DiskIOCountersSchema.nullable(),
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
  album_artist: z.string().nullable(),
  album_title: z.string().nullable(),
  artist: z.string().nullable(),
  duration: z.number().nullable(),
  is_fast_forward_enabled: z.boolean().nullable(),
  is_next_enabled: z.boolean().nullable(),
  is_pause_enabled: z.boolean().nullable(),
  is_play_enabled: z.boolean().nullable(),
  is_previous_enabled: z.boolean().nullable(),
  is_rewind_enabled: z.boolean().nullable(),
  is_stop_enabled: z.boolean().nullable(),
  playback_rate: z.number().nullable(),
  position: z.number().nullable(),
  repeat: z.string().nullable(),
  shuffle: z.boolean().nullable(),
  status: z.string().nullable(),
  subtitle: z.string().nullable(),
  thumbnail: z.string().nullable(),
  title: z.string().nullable(),
  track_number: z.number().nullable(),
  type: z.string().nullable(),
  updated_at: z.number().nullable(),
  volume: z.number().nullable(),
});

export type MediaData = z.infer<typeof MediaDataSchema>;

// Memory Module
export const MemoryDataSchema = z.object({
  swap: MemorySwapSchema.nullable(),
  virtual: MemoryVirtualSchema.nullable(),
});

export type MemoryData = z.infer<typeof MemoryDataSchema>;

// Networks Module
export const NetworksDataSchema = z.object({
  connections: z.array(NetworkConnectionSchema),
  io: NetworkIOSchema.nullable(),
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
  windows_sensors: SensorsWindowsSchema.nullable(),
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
  power_usage: z.number().nullable(),
  uptime: z.number(),
  users: z.array(SystemUserSchema),
  uuid: z.string(),
  version: z.string(),
  camera_usage: z.array(z.string()),
  ip_address_6: z.string(),
  pending_reboot: z.boolean().nullable(),
  run_mode: z.enum(["standalone"]),
  version_latest_url: z.string().nullable(),
  version_latest: z.string().nullable(),
  version_newer_available: z.boolean().nullable(),
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
