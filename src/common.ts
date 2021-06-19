import { app } from "electron";
import { Connection, createConnection } from "typeorm";
import { join } from "path";

import { Setting } from "./types/settings.entity";

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

export const appIconPath = app
  ? join(app.getAppPath(), "public/system-bridge-circle.png")
  : "";

export const appSmallIconPath = app
  ? join(app.getAppPath(), "public/system-bridge-circle-32x32.png")
  : "";

export async function getConnection(): Promise<Connection> {
  return await createConnection({
    type: "better-sqlite3",
    database: "api/system-bridge_v1.db",
    entities: [Setting],
    logging: false,
    synchronize: true,
  });
}

export async function getSettings(connection: Connection): Promise<Setting[]> {
  const settingsRepository = connection.getRepository(Setting);
  return settingsRepository.find();
}

export async function getSettingsObject(
  connection: Connection
): Promise<{ [key: string]: string }> {
  const settings: { [key: string]: string } = {};
  (await getSettings(connection)).forEach(
    ({ key, value }: Setting) => (settings[key] = value)
  );
  return settings;
}

export async function getSetting(
  connection: Connection,
  key: string
): Promise<Setting | undefined> {
  const settingsRepository = connection.getRepository(Setting);
  return settingsRepository.findOne(key);
}

export async function createSetting(
  connection: Connection,
  setting: Setting
): Promise<Setting | undefined> {
  const settingsRepository = connection.getRepository(Setting);
  await settingsRepository.insert(setting);
  return settingsRepository.findOne(setting.key);
}
