import { join } from "path";
import { platform } from "os";
import { readFileSync } from "fs";
import open from "open";
import queryString from "query-string";
import SysTray, { ClickEvent, MenuItem } from "systray2";

import {
  appDataDirectory,
  getConnection,
  getSettingsObject,
  getUpdates,
} from "./common";
import logger from "./logger";

interface ExtendedMenuItem extends MenuItem {
  click: () => void;
}

interface ExtendedClickEvent extends ClickEvent {
  item: ExtendedMenuItem;
}

export class Tray {
  async setupTray(): Promise<void> {
    const update = await getUpdates();
    const versionText = update.available
      ? `Version ${update.version.new} avaliable!`
      : `Latest Version (${update.version.current})`;

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

          logger.info(`Open Configuration: ${url}`);
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
          const url =
            "https://github.com/timmo001/system-bridge/releases/latest";
          logger.info(`Open URL: ${url}`);
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
              logger.info(`Open URL: ${url}`);
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
              logger.info(`Open URL: ${url}`);
              open(url);
            },
          },
          {
            title: "Discussions",
            tooltip: "Discussions",
            checked: false,
            enabled: true,
            click: async () => {
              const url =
                "https://github.com/timmo001/system-bridge/discussions";
              logger.info(`Open URL: ${url}`);
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

              logger.info(`Open Logs: ${path}`);
              open(path);
            },
          },
        ],
      },
    ];

    const systray = new SysTray({
      menu: {
        icon: readFileSync(
          join(
            __dirname,
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
            click: () => {
              logger.info("Exit application");
              process.exit(0);
            },
          },
        ],
      },
    });

    systray.onClick((action: ExtendedClickEvent) => {
      if (action?.item?.click) action.item.click();
    });
  }
}
