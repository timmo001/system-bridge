import { app } from "electron";
import { join } from "path";

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
