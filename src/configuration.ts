import { mdiRocketLaunch } from "@mdi/js";

export type SettingsValue =
  | null
  | boolean
  | string
  | number
  | SettingsObject
  | SettingsValue[];

export type SettingsObject = {
  [key: string]: SettingsValue;
};

export interface ConfigurationItem {
  name: string;
  description?: string;
  icon: string;
  defaultValue: SettingsValue;
  value: SettingsValue;
}

export interface ConfigurationSection {
  name: string;
  description?: string;
  icon?: string;
  items: {
    [item: string]: ConfigurationItem;
  };
}

export interface Configuration {
  [section: string]: ConfigurationSection;
}

const defaultConfiguration: Configuration = {
  general: {
    name: "General",
    items: {
      launchOnStartup: {
        name: "Launch on Startup",
        description: "Start the application on startup.",
        defaultValue: false,
        value: null,
        icon: mdiRocketLaunch,
      },
    },
  },
};

export default defaultConfiguration;
