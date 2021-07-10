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
  logger.info("Tray - Setup");

  const update = await getUpdates();
  const versionText = update.available
    ? `Version ${update.version.new} avaliable!`
    : `Latest Version (${update.version.current})`;

  logger.info("Tray - Import");
  const st = await import("systray2");
  logger.info("Tray - Import Default");
  const SysTray = st.default;
  logger.info("Tray - Imported");

  const items = [
    {
      title: "Settings",
      tooltip: "Settings",
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
          title: "Settings",
          apiKey: settings["network-apiKey"],
          apiPort: settings["network-apiPort"] || 9170,
          wsPort: settings["network-wsPort"] || 9172,
        })}`;

        logger.info(`Tray - Open Configuration: ${url}`);
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
              process.env.LOG_PATH || appDataDirectory,
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
          process.cwd(),
          platform() === "win32"
            ? "../public/system-bridge-circle.ico"
            : "../public/system-bridge-circle.png"
        ),
        { encoding: "base64" }
      ),
      title: "System Bridge",
      tooltip: "System Bridge",
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
