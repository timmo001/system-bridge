import {
  connectMobile,
  type Mobile,
  type MobilePushOptions,
  ShellShare,
} from "@timmo001/groundwork-mobile/view";
import type { Share } from "@timmo001/groundwork-pwa/view";
import { Effect, Option, Schema } from "effect";
import { Atom } from "effect/reactivity";

import mobileConfig from "../../mobile.config";
import pwaConfig from "../../pwa.config";
import { registry } from "./atoms";
import { navigate } from "./router";
import { setAndroidTheme } from "./theme";
import { generateUUID } from "./utils";

const SHARE_KEY = "system-bridge-pending-share";

const decodeShare = Schema.decodeUnknownOption(
  Schema.fromJsonString(ShellShare),
);

/**
 * A share from another app, waiting for the page to say what to do with it.
 * It's kept for the tab's session too, so a reload while it waits, such as
 * the page updating as the app comes back into view, still asks.
 */
export const pendingShare = Atom.make<Share | null>(
  Option.getOrNull(decodeShare(sessionStorage.getItem(SHARE_KEY))),
).pipe(Atom.keepAlive);

/** Sets the waiting share, or clears it once it's dealt with. */
export const setPendingShare = (share: Share | null) => {
  if (share === null) sessionStorage.removeItem(SHARE_KEY);
  else sessionStorage.setItem(SHARE_KEY, JSON.stringify(share));

  registry.set(pendingShare, share);
};

/**
 * The page's connection to the Android app's shell, or to the PWA's pieces
 * outside it, so one client runs in both.
 */
export const mobile: Promise<Mobile> = connectMobile(mobileConfig, {
  pwa: pwaConfig,
  onShare: setPendingShare,
  // A tapped push or a systembridge:// link, while the app is open. One for
  // another paired computer opens that computer's page instead
  onDeepLink: (url) => {
    if (new URL(url).origin === location.origin) navigate(url);
    else location.assign(url);
  },
  onAndroidTheme: (colors) => void setAndroidTheme(colors),
});

/**
 * Whether the page is inside the Android app, known at once: the shell puts
 * its bridge on the page before it loads.
 */
export const inApp = globalThis.groundworkShell !== undefined;

/**
 * Opens the app's computers page, where its computers are opened, edited,
 * removed and added. The app keeps their addresses and tokens, so in the
 * app it stands in for the connection page.
 */
export const openComputers = () =>
  void mobile.then((current) => current.call("showPairing", Schema.Boolean));

/** A computer paired with the app, as it lists them, never with its token. */
const Computer = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  url: Schema.String,
  /** The one the app has open, which is this page's. */
  current: Schema.Boolean,
});

export interface Computer extends Schema.Schema.Type<typeof Computer> {}

/** The computers paired with the app. */
export const pairedComputers = async (): Promise<readonly Computer[]> =>
  (await mobile).call("servers", Schema.Array(Computer));

const shareJson = Schema.encodeSync(Schema.toCodecJson(ShellShare));

/**
 * Sends a share on to another paired computer: the app opens it, and its
 * page asks what to do with the share.
 */
export const shareToComputer = async (
  id: string,
  share: Share,
): Promise<void> => {
  await (
    await mobile
  ).call("shareTo", Schema.Boolean, {
    id,
    share: shareJson(share),
  });
};

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

/** A name for this browser in the devices list, such as "Firefox on Linux". */
const browserName = () => {
  const named = (list: readonly (readonly [string, string])[]) =>
    list.find(([marker]) => navigator.userAgent.includes(marker))?.[1];

  const browser = named(browsers) ?? "A browser";
  const system = named(systems);

  return system === undefined ? browser : `${browser} on ${system}`;
};
