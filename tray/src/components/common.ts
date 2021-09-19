import { Connection, createConnection } from "typeorm";
import { join } from "path";
import { Logger } from "winston";
import { readFileSync } from "fs";
import axios from "axios";
import semver from "semver";

import { ApplicationUpdate } from "./entities/applicationUpdate.entity";
import { Setting } from "./entities/setting.entity";

const GITHUB_REPOSITORY = "timmo001/system-bridge";

export const appDataDirectory = join(
  process.env.APP_PATH ||
    process.env.APPDATA ||
    (process.platform == "darwin"
      ? process.env.HOME + "/Library/Preferences"
      : process.env.HOME + "/.local/share"),
  "system-bridge"
);

export const logsPath = join(
  process.env.LOG_PATH || appDataDirectory,
  "system-bridge.log"
);

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

export async function getUpdates(
  logger: Logger,
  tray = false
): Promise<ApplicationUpdate | undefined> {
  try {
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
      const versionNew = semver.clean(response.data.tag_name);
      const versionCurrent = getVersion(logger, tray);
      const available = semver.lt(versionCurrent, versionNew);
      return {
        available,
        newer: semver.gt(versionCurrent, versionNew),
        url: response.data.html_url,
        version: { current: versionCurrent, new: versionNew },
      };
    }
  } catch (e) {
    logger.error(
      `Error getting updates. ${e.message} - GitHub may be rate limiting your requests which will resolve itself later`
    );
  }
  return undefined;
}

export function getVersion(logger: Logger, tray = false): string {
  try {
    const json = JSON.parse(
      readFileSync(
        join(
          process.env.NODE_ENV === "development" ||
            process.env.SB_USE_CWD === "true"
            ? process.cwd()
            : process.execPath.substring(
                0,
                process.platform === "win32"
                  ? process.execPath.lastIndexOf("\\")
                  : process.execPath.lastIndexOf("/")
              ),
          tray ? "../package.json" : "package.json"
        ),
        {
          encoding: "utf8",
        }
      )
    );
    return semver.clean(json.version);
  } catch (e) {
    logger.error(`getVersion Error: ${e.message}`);
    return "0.0.0";
  }
}
