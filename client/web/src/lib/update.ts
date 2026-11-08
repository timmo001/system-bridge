/**
 * Keeps an open page on the computer's current web client. The backend
 * embeds the client, so an update or restart can serve a new build while a
 * page, such as one the Android app keeps in the background, still runs the
 * old one. Vite names the entry script by its content, so a different name
 * in the index the server sends now means a new build, and the page reloads.
 */
import { connectionStatus, registry } from "./atoms";

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
      location.reload();
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
