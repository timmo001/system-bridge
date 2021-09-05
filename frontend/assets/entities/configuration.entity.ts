import { SettingsValue } from "./settings.entity";

export interface Configuration {
  [section: string]: ConfigurationSection;
}

export interface ConfigurationSection {
  name: string;
  description?: string;
  icon?: string;
  items: {
    [item: string]: ConfigurationItem;
  };
}

export interface ConfigurationItem {
  name: string;
  description?: string;
  icon: string;
  defaultValue: SettingsValue;
  value: SettingsValue;
  minimum?: number;
  isPassword?: boolean;
  requiresServerRestart?: boolean;
  containerDisabled?: boolean;
}
