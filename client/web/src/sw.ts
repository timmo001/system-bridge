/**
 * The service worker, built on its own to `sw.js`: keeps the client's shell
 * so it starts offline, and shows the computer's pushes as notifications. It
 * only registers over HTTPS or on localhost.
 */
import {
  servePush,
  serveShell,
  type PushWorkerScope,
  type ShellWorkerScope,
} from "@timmo001/groundwork-pwa/worker";

import config from "../pwa.config";

declare const self: ShellWorkerScope & PushWorkerScope;

declare const SW_VERSION: string;

serveShell(self, config, {
  version: SW_VERSION,
  // The backend's API is always asked, never answered from the cache
  routes: [
    (event) =>
      new URL(event.request.url).pathname.startsWith("/api/")
        ? fetch(event.request)
        : undefined,
  ],
});

servePush(self, config);
