export interface SystemUser {
  name: string;
  active: boolean;
  terminal: string;
  host: string;
  started: number;
  pid: number;
}

export interface System {
  boot_time: number;
  fqdn: string;
  hostname: string;
  ip_address_4: string;
  mac_address: string;
  platform_version: string;
  platform: string;
  uptime: number;
  users: SystemUser[];
  uuid: string;
  version: string;
  camera_usage?: string[];
  ip_address_6?: string;
  pending_reboot?: boolean;
  version_latest?: string;
}
