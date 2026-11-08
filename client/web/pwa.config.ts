/**
 * What makes the web client installable. The build writes the manifest from
 * it, and the page and service worker read it. The service worker, and so
 * installing and pushes, only work over HTTPS.
 */
import { definePwaConfig } from "@timmo001/groundwork-pwa";

export default definePwaConfig({
  name: "System Bridge",
  description: "A bridge for your systems",
  theme: "bridge",
  startUrl: "/",
  scope: "/",
  shareTarget: true,
  offline: { worker: "/sw.js" },
});
