import { app } from "electron";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import execa, { ExecaChildProcess } from "execa";
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
        if (
          itemKey === "apiKey" &&
          !settings[sectionKey].items[itemKey].value
        ) {
          const key = uuidv4();
          electronSettings.set(`${sectionKey}-items-${itemKey}-value`, key);
          settings[sectionKey].items[itemKey].value = key;
        }
      }
    );
  });
  return settings;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function convertArrayToObject(array: any[], key: string): any {
  return array.reduce(
    (obj, item) => ({
      ...obj,
      [item[key]]: item,
    }),
    {}
  );
}

export async function getNode(): Promise<string | null> {
  const { stdout, stderr } = await execa("which", ["node"]);
  console.log({ stdout, stderr });
  return stdout ? stdout : null;
}

export async function runAsSudo(
  path: string,
  args: string[]
): Promise<ExecaChildProcess<string> | void> {
  const node = await getNode();
  if (node)
    return await execa("sudo", [node, join(app.getAppPath(), path), ...args]);
}
