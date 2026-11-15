/**
 * The Install button on the Devices page, for as long as the browser can
 * install System Bridge as an app. It's the only place left to install from
 * once the banner, `gw-install-banner`, is turned down.
 */
import { Atom } from "effect/reactivity";

import { registry } from "./atoms";
import { mobile } from "./mobile";

/** Whether the browser has an install prompt to show. */
export const canInstall = Atom.make(false).pipe(Atom.keepAlive);

/** Shows the browser's install prompt, which only a tap or click may do. */
export const install = () => void mobile.then(({ pwa }) => pwa?.install());

/** Follows whether the browser can install, which it offers and takes back. */
export const watchInstall = () =>
  void mobile.then(({ pwa }) => {
    if (pwa === undefined) return;

    const show = () => registry.set(canInstall, pwa.canInstall());

    window.addEventListener("gw-install-change", show);
    show();
  });
