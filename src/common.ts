import { Connection, createConnection, Repository } from "typeorm";
import { v4 as uuidv4 } from "uuid";

import { Setting } from "./settings/entities/setting.entity";

export async function getApiKey(
  settingsRepository: Repository<Setting>
): Promise<string> {
  let setting = await settingsRepository.findOne("network-apiKey");
  if (!setting) {
    await settingsRepository.insert({
      key: "network-apiKey",
      value: uuidv4(),
    });
    setting = await settingsRepository.findOne("network-apiKey");
  }
  return setting.value as string;
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

export async function getConnection(name = "common"): Promise<Connection> {
  return await createConnection({
    type: "better-sqlite3",
    name,
    database: "system-bridge_v1.db",
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
