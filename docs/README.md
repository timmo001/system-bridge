# System Bridge Docs

The System Bridge documentation site, built with [Blume](https://github.com/haydenbleasel/blume) and [`@timmo001/docs-kit`](https://github.com/timmo001/docs-kit). Published at <https://system-bridge.timmo.dev>, with a docs MCP server at <https://system-bridge.timmo.dev/mcp>.

## Commands

Run from `docs/`:

- `bun install` - install dependencies (the docs are part of the root Bun workspace)
- `bun run dev` - start the dev server
- `bun run build` - build the site to `dist/`, failing on content errors
- `bun run validate` - check every link and anchor
- `bun run preview` - preview the production build
- `bun run brand` - regenerate the brand images from `src/assets/logo.svg`
- `bun run deploy:preview` - upload a preview version without promoting it
- `bun run deploy` - deploy the built site to Cloudflare Workers

From the repo root you can also use the mise tasks: `mise run docs:dev`, `docs:build`, `docs:validate` and `docs:lint`.

## Structure

- Content lives in `src/content/docs/` and is exposed as routes based on file names.
- Site details, the sidebar and redirects live in `blume.config.ts`.
- `components.ts` adds docs-kit's home banner and header GitHub link.
- `theme.css` imports docs-kit's layout and sizes the banner logo.

## Hosting

The site builds to a Cloudflare Worker, since its MCP server needs a server. `bun run build` writes the Worker's config to `dist/server/wrangler.json` from `wrangler.jsonc`, which holds the name, custom domain and compatibility settings. Deploy with `bun run deploy`, which uses that generated config.
