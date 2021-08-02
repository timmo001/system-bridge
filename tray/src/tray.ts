import { ClickEvent, MenuItem } from "systray2";
import { join } from "path";
import { platform } from "os";
import { readFileSync } from "fs";
import open from "open";
import queryString from "query-string";

import {
  getAppDataDirectory,
  getConnection,
  getSettingsObject,
  getUpdates,
} from "../../src/common";
import { WebSocketConnection } from "../../src/websocket";
import logger from "../../src/logger";

interface ExtendedMenuItem extends MenuItem {
  click: () => void;
}

interface ExtendedClickEvent extends ClickEvent {
  item: ExtendedMenuItem;
}

async function setupTray(): Promise<void> {
  const updates = await getUpdates(process.env.NODE_ENV === "development");

  logger.info(
    "-----------------------------------------------------------------------------------------------------------------------"
  );
  logger.info(
    `System Bridge - Tray ${updates?.version.current}: ${JSON.stringify(
      process.argv
    )} - ${process.env.NODE_ENV}`
  );
  logger.info(
    "-----------------------------------------------------------------------------------------------------------------------"
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

        const url = `${
          process.env.NODE_ENV === "development"
            ? "http://localhost:3000/"
            : `http://localhost:9170/app`
        }?${queryString.stringify({
          id: "configuration",
          apiKey: settings["network-apiKey"],
          apiPort: settings["network-apiPort"] || 9170,
          wsPort: settings["network-wsPort"] || 9172,
        })}`;

        logger.info(`Tray - Open Settings: ${url}`);
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

        const url = `${
          process.env.NODE_ENV === "development"
            ? "http://localhost:3000/"
            : `http://localhost:9170/app`
        }?${queryString.stringify({
          id: "data",
          apiKey: settings["network-apiKey"],
          apiPort: settings["network-apiPort"] || 9170,
          wsPort: settings["network-wsPort"] || 9172,
        })}`;

        logger.info(`Tray - Open Data: ${url}`);
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
        logger.info(`Tray - Open URL: ${url}`);
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
            logger.info(`Tray - Open URL: ${url}`);
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
            logger.info(`Tray - Open URL: ${url}`);
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
            logger.info(`Tray - Open URL: ${url}`);
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
            logger.info(`Tray - Open URL: ${url}`);
            open(url);
          },
        },
        {
          title: "Open Logs",
          tooltip: "Open Logs",
          checked: false,
          enabled: true,
          click: async () => {
            const path = join(
              process.env.LOG_PATH || getAppDataDirectory(),
              "system-bridge.log"
            );
            logger.info(`Tray - Open Logs: ${path}`);
            open(path);
          },
        },
      ],
    },
  ];

  logger.info("Tray - Create Tray");

  const systray = new SysTray({
    menu: {
      icon: readFileSync(
        join(
          process.env.NODE_ENV === "development"
            ? process.cwd()
            : process.execPath.substring(
                0,
                process.platform === "win32"
                  ? process.execPath.lastIndexOf("\\")
                  : process.execPath.lastIndexOf("/")
              ),
          process.env.NODE_ENV === "development" ? "../public/" : "./",
          `system-bridge-circle.${
            platform() === "win32"
              ? "ico"
              : platform() === "darwin"
              ? "icns"
              : "png"
          }`
        ),
        { encoding: "base64" }
      ),
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
            logger.info("Tray - Exit application");
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
    logger.info("Tray - Started");

    systray.onError((err: Error) =>
      logger.error(`Tray - Error: ${err.message}`)
    );
    systray.onExit((code: number) => {
      logger.info(`Tray - Exit: ${code}`);
    });

    systray.onClick((action: ExtendedClickEvent) => {
      if (action?.item?.click) action.item.click();
    });
  }
}

setupTray();
