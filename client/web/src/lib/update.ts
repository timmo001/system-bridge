/**
 * Keeps an open page on the computer's current web client. The backend
 * embeds the client, so an update or restart can serve a new build while a
 * page, such as one the Android app keeps in the background, still runs the
 * old one. Two things tell the page: the backend refuses an API call from a
 * page of another version with a 426, and Vite names the entry script by its
 * content, so a different name in the index the server sends means a new
 * build. Either way Groundwork's `watchVersion` moves the page onto it.
 */
import { watchVersion } from "@timmo001/groundwork-pwa/update";
import { Atom } from "effect/reactivity";

import { connectionStatus, registry } from "./atoms";
import { mobile } from "./mobile";

/** Whether the page is still on an old version after reloading once. */
export const versionStale = Atom.make(false).pipe(Atom.keepAlive);

/**
 * The watch on the page's version, which comes from the meta tag the backend
 * puts in the index. It has none when something else serves the page, such
 * as the dev server or the hosted client, which no backend holds to a version.
 */
export const update = watchVersion({
  app: "system-bridge",
  worker: mobile.then(({ pwa }) => pwa?.worker),
  onStale: () => registry.set(versionStale, true),
});

const entrySelector = 'script[type="module"][src]';

/** The entry script this page loaded, such as /assets/index-1a2b3c.js. */
const loaded = document.querySelector(entrySelector)?.getAttribute("src");

let checking = false;

const checkForUpdate = async () => {
  if (loaded === undefined || loaded === null || checking) return;

  checking = true;

  try {
    const response = await fetch("/", { cache: "no-store" });

    if (!response.ok) return;

    const served = new DOMParser()
      .parseFromString(await response.text(), "text/html")
      .querySelector(entrySelector)
      ?.getAttribute("src");

    if (served !== undefined && served !== null && served !== loaded)
      update.mismatched();
  } catch {
    // The computer is unreachable; the next check tries again
  } finally {
    checking = false;
  }
};

/** Checks when the page comes back into view, and when it reconnects. */
export const watchForUpdates = () => {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void checkForUpdate();
  });

  let wasConnected = registry.get(connectionStatus).isConnected;

  registry.subscribe(connectionStatus, (status) => {
    // A reconnect usually follows the backend restarting, maybe updated
    if (status.isConnected && !wasConnected) void checkForUpdate();

    wasConnected = status.isConnected;
  });
};
