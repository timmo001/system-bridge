export interface ApplicationUpdate {
  available: boolean;
  newer: boolean;
  url: string;
  version: { current: string; new: string };
}

export interface Information {
  address: string;
  apiPort: number;
  cli: boolean;
  container: boolean;
  fqdn: string;
  host: string;
  ip: string;
  mac: string;
  updates?: ApplicationUpdate;
  uuid: string;
  version: string;
  websocketAddress: string;
  websocketPort: number;
}
