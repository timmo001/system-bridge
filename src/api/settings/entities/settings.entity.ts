import { ConfigurationItem } from "../../../configuration";

export interface Setting {
  section: string;
  key: string;
  item: ConfigurationItem;
}

export type Settings = Array<Setting>;
