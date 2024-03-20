export interface DiskUsage {
  max_file_size?: number;
  max_path_length?: number;
  usage?: number;
}

export interface DiskPartition {
  device: string;
  mount_point: string;
  filesystem_type: string;
  options: string;
  max_file_size: number;
  max_path_length: number;
  usage?: DiskUsage;
}

export interface DiskIOCounters {
  read_count: number;
  write_count: number;
  read_bytes: number;
  write_bytes: number;
  read_time: number;
  write_time: number;
}

export interface Disk {
  name: string;
  partitions: DiskPartition[];
  io_counters?: DiskIOCounters;
}

export interface Disks {
  devices: Disk[];
  io_counters?: DiskIOCounters;
}
