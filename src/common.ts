import { app } from "electron";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import electronSettings from "electron-settings";
import WebSocket from "ws";

import defaultConfiguration, { Configuration } from "./configuration";
import { Event } from "./api/events/entities/event.entity";

export function getSettings(): Configuration {
  const settings: Configuration = defaultConfiguration;
  Object.keys(defaultConfiguration).forEach((sectionKey: string) => {
    Object.keys(defaultConfiguration[sectionKey].items).forEach(
      (itemKey: string) => {
        let settingValue;
        if (process.env.NODE_ENV !== "test") {
          try {
            settingValue = electronSettings.getSync(
              `${sectionKey}-items-${itemKey}-value`
            );
          } catch (e) {
            console.log(e);
          }
        }
        settings[sectionKey].items[itemKey].value =
          settingValue || settings[sectionKey].items[itemKey].defaultValue;
        if (
          itemKey === "apiKey" &&
          !settings[sectionKey].items[itemKey].value
        ) {
          const key = uuidv4();
          electronSettings.set(`${sectionKey}-items-${itemKey}-value`, key);
          settings[sectionKey].items[itemKey].value = key;
        }
      }
    );
  });
  return settings;
}

export async function getSetting(key: string): Promise<unknown> {
  return await electronSettings.get(key);
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export async function setSetting(key: string, value: any): Promise<void> {
  await electronSettings.set(key, value);
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

export const appIconPath = app
  ? join(app.getAppPath(), "public/system-bridge-circle.png")
  : "";

export const appSmallIconPath = app
  ? join(app.getAppPath(), "public/system-bridge-circle-32x32.png")
  : "";

export async function wsConnect(settings?: Configuration): Promise<WebSocket> {
  if (!settings) settings = getSettings();
  const networkSettings = settings?.network.items;

  const wsPort: number =
    typeof networkSettings?.wsPort?.value === "number"
      ? networkSettings?.wsPort?.value
      : 9170;

  const ws = new WebSocket(`ws://localhost:${wsPort}`);
  await new Promise<void>((resolve) => ws.on("open", () => resolve()));
  return ws;
}

export async function wsSendEvent(
  event: Event,
  ws?: WebSocket,
  keepAlive?: boolean
): Promise<WebSocket> {
  const settings = getSettings();
  if (!ws || ws.readyState !== ws.OPEN) {
    ws = await wsConnect(settings);
  }
  const networkSettings = settings?.network.items;
  ws?.send(
    JSON.stringify({
      event: "events",
      data: {
        "api-key": networkSettings?.apiKey?.value,
        data: event,
      },
    })
  );
  if (ws && !keepAlive) ws.close();
  return ws;
}
