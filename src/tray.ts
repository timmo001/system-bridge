import { join } from "path";
import { platform } from "os";
import open from "open";
import queryString from "query-string";
import SysTray, { ClickEvent, MenuItem } from "systray2";

import logger from "./logger";
import { readFileSync } from "fs";
import { getConnection, getSettingsObject } from "./common";

interface ExtendedMenuItem extends MenuItem {
  click: () => void;
}

interface ExtendedClickEvent extends ClickEvent {
  item: ExtendedMenuItem;
}

const items = [
  {
    title: "Configuration",
    tooltip: "Configuration",
    checked: false,
    enabled: true,
    click: async () => {
      const connection = await getConnection();
      const settings = await getSettingsObject(connection);
      await connection.close();

      const url = `${
        process.env.NODE_ENV === "development"
          ? "http://localhost:3000/"
          : `file://${join(__dirname, "../frontend/build/index.html")}`
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
];

export class Tray {
  setupTray(): void {
    logger.info("setupTray: setup");
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
      if (action.item.click !== null) action.item.click();
    });
  }
}
