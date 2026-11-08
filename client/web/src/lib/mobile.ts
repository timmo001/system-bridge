import {
  connectMobile,
  type Mobile,
  type MobilePushOptions,
} from "@timmo001/groundwork-mobile/view";
import type { Share } from "@timmo001/groundwork-pwa/view";
import { Effect, Schema } from "effect";
import { Atom } from "effect/reactivity";

import mobileConfig from "../../mobile.config";
import pwaConfig from "../../pwa.config";
import { registry } from "./atoms";
import { navigate } from "./router";
import { setAndroidTheme } from "./theme";
import { generateUUID } from "./utils";

/** A share from another app, waiting for the page to say what to do with it. */
export const pendingShare = Atom.make<Share | null>(null).pipe(Atom.keepAlive);

/**
 * The page's connection to the Android app's shell, or to the PWA's pieces
 * outside it, so one client runs in both.
 */
export const mobile: Promise<Mobile> = connectMobile(mobileConfig, {
  pwa: pwaConfig,
  onShare: (share) => registry.set(pendingShare, share),
  // A tapped push or a systembridge:// link, while the app is open. One for
  // another paired computer opens that computer's page instead
  onDeepLink: (url) => {
    if (new URL(url).origin === location.origin) navigate(url);
    else location.assign(url);
  },
  onAndroidTheme: (colors) => void setAndroidTheme(colors),
});

/** The connection, for components to read once it's made. */
export const mobileConnection = Atom.make(Effect.promise(() => mobile)).pipe(
  Atom.keepAlive,
);

const CLIENT_ID_KEY = "system-bridge-client-id";

/** The app's own client: its install and the phone's model, such as "Pixel 9". */
const AppClient = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  platform: Schema.Literal("android"),
});

/**
 * This install, so it has one push subscription and one name. The Android
 * app names it, as the page can't read the phone's model; a browser keeps
 * its own.
 */
export const pushClient = async (
  current: Mobile,
): Promise<MobilePushOptions["client"]> => {
  if (current.shell) return current.call("client", AppClient);

  let id = localStorage.getItem(CLIENT_ID_KEY);

  // Not crypto.randomUUID, which is only there over HTTPS
  if (id === null) {
    id = generateUUID();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }

  return { id, name: browserName(), platform: "web" };
};

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
