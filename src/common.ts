import { Connection, createConnection, Repository } from "typeorm";
import { join } from "path";
import { readFileSync } from "fs";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import semver from "semver";

import { ApplicationUpdate } from "./information/entities/information.entity";
import { Setting } from "./settings/entities/setting.entity";

export const GITHUB_REPOSITORY = "timmo001/system-bridge";

export const appDataDirectory = join(
  process.env.APP_PATH ||
    process.env.APPDATA ||
    (process.platform == "darwin"
      ? process.env.HOME + "/Library/Preferences"
      : process.env.HOME + "/.local/share"),
  "system-bridge"
);

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
    database: join(appDataDirectory, "system-bridge_v1.db"),
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

export async function getUpdates(): Promise<ApplicationUpdate | undefined> {
  const response = await axios.get<{
    html_url: string;
    prerelease: boolean;
    tag_name: string;
  }>(`https://api.github.com/repos/${GITHUB_REPOSITORY}/releases/latest`);
  if (
    response &&
    response.status < 400 &&
    response.data?.prerelease === false
  ) {
    const versionCurrent = getVersion();
    const versionNew = semver.clean(response.data.tag_name);
    const available = semver.lt(versionCurrent, versionNew);
    return {
      available,
      url: response.data.html_url,
      version: { current: versionCurrent, new: versionNew },
    };
  }
  return undefined;
}

export function getVersion(): string {
  const json = JSON.parse(
    readFileSync(join(process.cwd(), "package.json"), {
      encoding: "utf8",
    })
  );
  return semver.clean(json.version);
}
