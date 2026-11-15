/**
 * The offer to install System Bridge as an app, where the browser can: a
 * banner until it's turned down once, either with Not now or in the
 * browser's own prompt, and an Install button on the Devices page for as long
 * as the browser can, which is the only place left to install from once the
 * banner's dismissed.
 */
import { Atom } from "effect/reactivity";

import { registry } from "./atoms";
import { mobile } from "./mobile";

const dismissedKey = "system-bridge:install-dismissed";

/** Whether the browser has an install prompt to show. */
export const canInstall = Atom.make(false).pipe(Atom.keepAlive);

/** Whether the banner was turned down. */
export const installDismissed = Atom.make(
  localStorage.getItem(dismissedKey) !== null,
).pipe(Atom.keepAlive);

export const dismissInstall = () => {
  localStorage.setItem(dismissedKey, new Date().toISOString());
  registry.set(installDismissed, true);
};

/** Shows the browser's install prompt, which only a tap or click may do. */
export const install = () => {
  void mobile
    .then(({ pwa }) => pwa?.install())
    .then((outcome) => {
      if (outcome === "dismissed") dismissInstall();
    });
};

/** Follows whether the browser can install, which it offers and takes back. */
export const watchInstall = () =>
  void mobile.then(({ pwa }) => {
    if (pwa === undefined) return;

    const show = () => registry.set(canInstall, pwa.canInstall());

    window.addEventListener("gw-install-change", show);
    show();
  });
