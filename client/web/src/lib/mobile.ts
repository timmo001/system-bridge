import {
  connectMobile,
  type Mobile,
  type MobilePushOptions,
} from "@timmo001/groundwork-mobile/view";
import type { Share } from "@timmo001/groundwork-pwa/view";
import { Effect } from "effect";
import { Atom } from "effect/reactivity";

import mobileConfig from "../../mobile.config";
import pwaConfig from "../../pwa.config";
import { registry } from "./atoms";
import { setAndroidTheme } from "./theme";

/** A share from another app, waiting for the page to say what to do with it. */
export const pendingShare = Atom.make<Share | null>(null).pipe(Atom.keepAlive);

/**
 * The page's connection to the Android app's shell, or to the PWA's pieces
 * outside it, so one client runs in both.
 */
export const mobile: Promise<Mobile> = connectMobile(mobileConfig, {
  pwa: pwaConfig,
  onShare: (share) => registry.set(pendingShare, share),
  onAndroidTheme: (colors) => void setAndroidTheme(colors),
});

/** The connection, for components to read once it's made. */
export const mobileConnection = Atom.make(Effect.promise(() => mobile)).pipe(
  Atom.keepAlive,
);

const CLIENT_ID_KEY = "system-bridge-client-id";

/** This install, kept so it has one push subscription and one name. */
export const pushClient = (current: Mobile): MobilePushOptions["client"] => {
  let id = localStorage.getItem(CLIENT_ID_KEY);

  if (id === null) {
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }

  return current.shell
    ? { id, name: phoneModel() ?? "Android phone", platform: "android" }
    : { id, name: browserName(), platform: "web" };
};

/** The phone's model from the WebView's user agent, such as "Pixel 9". */
const phoneModel = () =>
  /Android [\d.]+; ([^;)]+?)(?: Build\/|\))/.exec(navigator.userAgent)?.[1];

/** What the user agent names, first match wins, as [marker, name]. */
const browsers = [
  ["Firefox/", "Firefox"],
  ["Edg/", "Edge"],
  ["Chrome/", "Chrome"],
  ["Safari/", "Safari"],
] as const;

const systems = [
  ["Android", "Android"],
  ["iPhone", "iOS"],
  ["iPad", "iOS"],
  ["Windows", "Windows"],
  ["Mac OS", "macOS"],
  ["Linux", "Linux"],
] as const;

/** A name for this browser in the phones list, such as "Firefox on Linux". */
const browserName = () => {
  const named = (list: readonly (readonly [string, string])[]) =>
    list.find(([marker]) => navigator.userAgent.includes(marker))?.[1];

  const browser = named(browsers) ?? "A browser";
  const system = named(systems);

  return system === undefined ? browser : `${browser} on ${system}`;
};
