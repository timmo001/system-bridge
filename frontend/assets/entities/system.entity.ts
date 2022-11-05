export interface System {
  id?: string;
  boot_time: number;
  fqdn: string;
  hostname: string;
  ip_address_4: string;
  mac_address: string;
  platform: string;
  platform_version: string;
  uptime: number;
  uuid: string;
  version: string;
  version_latest?: string;
  version_newer_available?: boolean;
  last_updated?: {
    boot_time: number;
    fqdn: number;
    hostname: number;
    ip_address_4: number;
    mac_address: number;
    platform: number;
    platform_version: number;
    uptime: number;
    uuid: number;
    version: number;
    version_latest?: number;
    version_newer_available?: number;
  };
}
