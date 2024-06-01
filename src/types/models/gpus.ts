export interface GPU {
  name: string;
  core_clock?: number;
  core_load?: number;
  fan_speed?: number;
  memory_clock?: number;
  memory_load?: number;
  memory_free?: number;
  memory_used?: number;
  memory_total?: number;
  power_usage?: number;
  temperature?: number;
}

export type GPUs = GPU[];
