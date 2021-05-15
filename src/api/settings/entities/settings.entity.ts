import { ConfigurationItem } from "../../../configuration";

export interface Setting extends ConfigurationItem {
  section: string;
  key: string;
}

export type Settings = Array<Setting>;
