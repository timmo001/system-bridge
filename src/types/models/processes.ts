export interface Process {
  cpu_usage?: number;
  created?: number;
  memory_usage?: number;
  path?: string;
  status?: string;
  username?: string;
  working_directory?: string;
}

export type Processes = Process[];
