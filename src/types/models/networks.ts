export interface NetworkAddress {
  address?: string;
  family?: string;
  netmask?: string;
  broadcast?: string;
  ptp?: string;
}

export interface NetworkStats {
  isup?: boolean;
  duplex?: string;
  speed?: number;
  mtu?: number;
  flags?: string[];
}

export interface NetworkConnection {
  fd?: number;
  family?: number;
  type?: number;
  laddr?: string;
  raddr?: string;
  status?: string;
  pid?: number;
}

export interface NetworkIO {
  bytes_sent?: number;
  bytes_recv?: number;
  packets_sent?: number;
  packets_recv?: number;
  errin?: number;
  errout?: number;
  dropin?: number;
  dropout?: number;
}

export interface Network {
  name?: string;
  addresses?: NetworkAddress[];
  stats?: NetworkStats;
}

export interface Networks {
  connections?: NetworkConnection[];
  io?: NetworkIO;
  networks?: Network[];
}
