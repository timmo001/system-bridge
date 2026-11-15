/**
 * Keeps an open page on the computer's current web client. The backend
 * embeds the client, so an update or restart can serve a new build while a
 * page, such as one the Android app keeps in the background, still runs the
 * old one. Two things tell the page: the backend refuses an API call from a
 * page of another version with a 426, and Vite names the entry script by its
 * content, so a different name in the index the server sends means a new
 * build. Either way the service worker checks for the new build, which takes
 * over by itself, and the page reloads onto it. Without a worker, such as
 * over plain HTTP on the network, the reload fetches it itself.
 */
import { Atom } from "effect/reactivity";

import { connectionStatus, registry } from "./atoms";
import { mobile } from "./mobile";

/** The header an API call sends to say which version its page is. */
export const versionHeader = "X-System-Bridge-Version";

/**
 * The version of the backend that served this page, which it puts in the
 * index. Not there when something else serves the page, such as the dev
 * server or the hosted client, which no backend holds to a version.
 */
export const pageVersion =
  document
    .querySelector('meta[name="system-bridge-version"]')
    ?.getAttribute("content") ?? undefined;

const entrySelector = 'script[type="module"][src]';

/** The entry script this page loaded, such as /assets/index-1a2b3c.js. */
const loaded = document.querySelector(entrySelector)?.getAttribute("src");

/** What the page asked to be reloaded for, so one release reloads it once. */
const reloadedKey = "system-bridge:reloaded-for-version";

/** How long a new worker gets to take over before the page reloads anyway. */
const takeOverTimeout = 10_000;

/** Whether the page is still on an old version after reloading once. */
export const versionStale = Atom.make(false).pipe(Atom.keepAlive);

let updating = false;

/** Reloads the page onto the backend's release, once the worker has it. */
const reloadForUpdate = async () => {
  const pwa = (await mobile).pwa;
  const registration = await pwa?.worker;

  if (
    registration !== undefined &&
    navigator.serviceWorker.controller !== null
  ) {
    const takenOver = new Promise<void>((resolve) => {
      navigator.serviceWorker.addEventListener("controllerchange", () =>
        resolve(),
      );
      setTimeout(resolve, takeOverTimeout);
    });

    await registration.update().catch(() => undefined);

    if (registration.installing !== null || registration.waiting !== null) {
      await takenOver;
    }
  }

  location.reload();
};

/**
 * Called when the page finds it's not the backend's version. It moves onto
 * the new release once by itself, and says so where that didn't help. Every
 * call meanwhile waits on the same move.
 */
export const onMismatched = () => {
  if (updating || registry.get(versionStale)) return;

  const identity = pageVersion ?? loaded ?? "";

  if (sessionStorage.getItem(reloadedKey) !== identity) {
    sessionStorage.setItem(reloadedKey, identity);
    updating = true;
    void reloadForUpdate();

    return;
  }

  registry.set(versionStale, true);
};

/** Reloads the page, for the banner's button. */
export const reload = () => location.reload();

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
      onMismatched();
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
