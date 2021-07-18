export interface ApplicationUpdate {
  available: boolean;
  newer: boolean;
  url: string;
  version: { current: string; new: string };
}

export interface Information {
  address: string;
  apiPort: number;
  fqdn: string;
  host: string;
  ip: string;
  mac: string;
  updates?: ApplicationUpdate;
  uuid: any;
  version: string;
  websocketAddress: string;
  websocketPort: number;
}
