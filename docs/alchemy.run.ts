/**
 * The docs site's infrastructure as an Alchemy stack: the `system-bridge-docs`
 * Worker at system-bridge.timmo.dev, serving what `blume build` leaves in
 * `dist/`. Deploy it with `mise run docs:deploy`, which builds the site first.
 */
import * as Cloudflare from "@alchemy.run/cloudflare";
import { blumeWorker } from "@timmo001/docs-kit/blume/worker";
import * as Alchemy from "alchemy";
import * as Effect from "effect/Effect";

export default Alchemy.Stack(
  "system-bridge-docs",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const built = yield* Effect.promise(() =>
      blumeWorker(new URL("dist/", import.meta.url)),
    );

    // Blume only writes the flags from a root wrangler config, which this
    // site no longer has, so keep the Worker's nodejs_compat here. The Worker
    // was deployed by Wrangler before this stack, so it's adopted rather than
    // failing as someone else's
    const docs = yield* Cloudflare.Worker("Docs", {
      name: "system-bridge-docs",
      domain: "system-bridge.timmo.dev",
      ...built,
      compatibility: {
        ...built.compatibility,
        flags: [...built.compatibility.flags, "nodejs_compat"],
      },
    }).pipe(Alchemy.AdoptPolicy.adopt(true));

    return { url: docs.url };
  }),
);
