import { ClickEvent, MenuItem } from "systray2";
import { join } from "path";
import { platform } from "os";
import { readFileSync } from "fs";
import open from "open";
import queryString from "query-string";

import {
  appDataDirectory,
  getConnection,
  getSettingsObject,
  getUpdates,
} from "./common";
import { Logger } from "./logger";
import { WebSocketConnection } from "./websocket";
interface ExtendedMenuItem extends MenuItem {
  click: () => void;
}

interface ExtendedClickEvent extends ClickEvent {
  item: ExtendedMenuItem;
}

async function setupTray(): Promise<void> {
  const { logger } = new Logger("Tray");

  const updates = await getUpdates(logger);

  logger.info(
    `${updates?.version.current}: ${process.cwd()} - ${JSON.stringify(
      process.argv
    )} - ${process.env.NODE_ENV}`
  );

  const versionText = updates
    ? updates.available
      ? `Version ${updates.version.new} avaliable! (${updates.version.current} -> ${updates.version.new})`
      : `${
          updates.newer
            ? `Version Newer (${updates.version.current} > ${updates.version.new})`
            : `Latest Version (${updates.version.current})`
        }`
    : "Latest Version";

  const st = await import("systray2");
  const SysTray = st.default;

  const items = [
    {
      title: "Open Settings",
      tooltip: "Open Settings",
      checked: false,
      enabled: true,
      click: async () => {
        const connection = await getConnection();
        const settings = await getSettingsObject(connection);
        await connection.close();

        const url = `http://localhost:${
          process.env.node_env === "development" ? 3000 : 9170
        }/app/settings?${queryString.stringify({
          apiKey: settings["network-apiKey"],
          apiPort: settings["network-apiPort"] || 9170,
          wsPort: settings["network-wsPort"] || 9172,
        })}`;
        open(url);
      },
    },
    SysTray.separator,
    {
      title: "View Data",
      tooltip: "View Data",
      checked: false,
      enabled: true,
      click: async () => {
        const connection = await getConnection();
        const settings = await getSettingsObject(connection);
        await connection.close();

        const url = `http://localhost:${
          process.env.node_env === "development" ? 3000 : 9170
        }/app/data?${queryString.stringify({
          apiKey: settings["network-apiKey"],
          apiPort: settings["network-apiPort"] || 9170,
          wsPort: settings["network-wsPort"] || 9172,
        })}`;
        open(url);
      },
    },
    SysTray.separator,
    {
      title: versionText,
      tooltip: versionText,
      checked: false,
      enabled: true,
      click: async () => {
        const url = "https://github.com/timmo001/system-bridge/releases/latest";
        open(url);
      },
    },
    {
      title: "Help",
      tooltip: "Help",
      checked: false,
      enabled: true,
      items: [
        {
          title: "Documentation / Website",
          tooltip: "Documentation / Website",
          checked: false,
          enabled: true,
          click: async () => {
            const url = "https://system-bridge.timmo.dev";
            open(url);
          },
        },
        {
          title: "Suggest a Feature",
          tooltip: "Suggest a Feature",
          checked: false,
          enabled: true,
          click: async () => {
            const url =
              "https://github.com/timmo001/system-bridge/issues/new/choose";
            open(url);
          },
        },
        {
          title: "Report an issue",
          tooltip: "Report an issue",
          checked: false,
          enabled: true,
          click: async () => {
            const url =
              "https://github.com/timmo001/system-bridge/issues/new/choose";
            open(url);
          },
        },
        {
          title: "Discussions",
          tooltip: "Discussions",
          checked: false,
          enabled: true,
          click: async () => {
            const url = "https://github.com/timmo001/system-bridge/discussions";
            open(url);
          },
        },
        {
          title: "View Logs",
          tooltip: "View Logs",
          checked: false,
          enabled: true,
          click: async () => {
            const connection = await getConnection();
            const settings = await getSettingsObject(connection);
            await connection.close();

            const url = `http://localhost:${
              process.env.node_env === "development" ? 3000 : 9170
            }/app/logs?${queryString.stringify({
              apiKey: settings["network-apiKey"],
              apiPort: settings["network-apiPort"] || 9170,
              wsPort: settings["network-wsPort"] || 9172,
            })}`;
            open(url);
          },
        },
        {
          title: "Open Log File",
          tooltip: "Open Log File",
          checked: false,
          enabled: true,
          click: async () => {
            const path = join(
              process.env.LOG_PATH || appDataDirectory,
              "system-bridge.log"
            );
            open(path);
          },
        },
      ],
    },
  ];

  logger.info("Create Tray");

  let icon = "";
  try {
    icon = readFileSync(
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
        "public",
        `system-bridge-circle.${
          platform() === "win32"
            ? "ico"
            : platform() === "darwin"
            ? "icns"
            : "png"
        }`
      ),
      { encoding: "base64" }
    );
  } catch (e) {
    logger.error(`Error getting icon: ${e.message}`);
  }

  const systray = new SysTray({
    menu: {
      icon,
      title: "System Bridge",
      tooltip: `System Bridge ${updates ? `v${updates.version.current}` : ""}`,
      items: [
        ...items,
        SysTray.separator,
        {
          title: "Exit",
          tooltip: "Exit",
          checked: false,
          enabled: true,
          click: async () => {
            const { logger } = new Logger("Tray");
            logger.info("Exit application");
            logger.close();
            const connection = await getConnection();
            const settings = await getSettingsObject(connection);
            await connection.close();

            const ws = new WebSocketConnection(
              settings["network-wsPort"]
                ? Number(settings["network-wsPort"])
                : 9172,
              settings["network-apiKey"],
              false,
              () => {
                ws.sendEvent({ name: "exit-application" });
                systray.kill(true);
              }
            );
          },
        },
      ],
    },
  });

  if (systray) {
    await systray.ready();

    const { logger } = new Logger("Tray");
    logger.info("Started");

    systray.onError((err: Error) => logger.error(`Error: ${err.message}`));

    systray.onClick((action: ExtendedClickEvent) => {
      if (action?.item?.click) action.item.click();
    });
  }

  logger.close();
}

(async () => {
  setupTray();
})();
