import electronSettings from "electron-settings";

import defaultConfiguration, { Configuration } from "./configuration";

export function getSettings(): Configuration {
  const settings: Configuration = defaultConfiguration;
  Object.keys(defaultConfiguration).forEach((sectionKey: string) => {
    Object.keys(defaultConfiguration[sectionKey].items).forEach(
      (itemKey: string) => {
        settings[sectionKey].items[itemKey].value =
          electronSettings.getSync(`${sectionKey}-items-${itemKey}-value`) ||
          settings[sectionKey].items[itemKey].defaultValue;
      }
    );
  });
  return settings;
}

export function convertArrayToObject(array: any[], key: string): any {
  return array.reduce(
    (obj, item) => ({
      ...obj,
      [item[key]]: item,
    }),
    {}
  );
}
