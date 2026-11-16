/**
 * The hosted web client's infrastructure as an Alchemy stack: the
 * `system-bridge-client` Worker at system-bridge-client.timmo.dev, serving
 * what `bun run build` leaves in `dist/`. Deploy it with
 * `mise run deploy:client:web`.
 */
import * as Cloudflare from "@alchemy.run/cloudflare";
import * as Alchemy from "alchemy";
import * as Effect from "effect/Effect";

export default Alchemy.Stack(
  "system-bridge-client",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    // The build's own post-build step writes the PWA manifest and service
    // worker into dist/, which the Go binary embeds too, so run that build
    // as it is rather than Alchemy's Vite build. The Worker was deployed by
    // Wrangler before this stack, so it's adopted rather than failing as
    // someone else's
    const client = yield* Cloudflare.Website.StaticSite("Client", {
      name: "system-bridge-client",
      domain: "system-bridge-client.timmo.dev",
      command: "bun run build",
      outdir: "dist",
      compatibility: { date: "2026-07-17" },
      assets: { notFoundHandling: "single-page-application" },
      // The client builds the connector from source, so rebuild when it
      // changes too
      memo: {
        include: [
          "**/*",
          "../../connector/typescript/package.json",
          "../../connector/typescript/src/**",
        ],
        lockfile: true,
      },
    }).pipe(Alchemy.AdoptPolicy.adopt(true));

    return { url: client.url };
  }),
);
