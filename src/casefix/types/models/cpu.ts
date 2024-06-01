export interface CPUFrequency {
  current?: number;
  min?: number;
  max?: number;
}

export interface CPUStats {
  ctx_switches?: number;
  interrupts?: number;
  soft_interrupts?: number;
  syscalls?: number;
}

export interface CPUTimes {
  user?: number;
  system?: number;
  idle?: number;
  interrupt?: number;
  dpc?: number;
}

export interface CPU {
  count?: number;
  frequency?: CPUFrequency;
  frequency_per_cpu?: CPUFrequency[];
  load_average?: number;
  power_package?: number;
  power_per_cpu?: number[];
  stats?: CPUStats;
  temperature?: number;
  times?: CPUTimes;
  times_per_cpu?: CPUTimes[];
  times_percent?: CPUTimes;
  times_percent_per_cpu?: CPUTimes[];
  usage?: number;
  usage_per_cpu?: number[];
  voltage?: number;
}
