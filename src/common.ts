import { app } from "electron";
import { ConnectionOptions, createConnection } from "typeorm";
import { join } from "path";
import { Setting } from "./types/settings.entity";

const connectionOptions: ConnectionOptions = {
  type: "sqlite",
  database: "api/system-bridge_v1.db",
  entities: [Setting],
  logging: true,
};

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

export async function getSettings(): Promise<Setting[]> {
  const connection = await createConnection(connectionOptions);
  const settingsRepository = connection.getRepository(Setting);
  return settingsRepository.find();
}

export async function getSetting(key: string): Promise<Setting | undefined> {
  const connection = await createConnection(connectionOptions);
  const settingsRepository = connection.getRepository(Setting);
  return settingsRepository.findOne(key);
}
