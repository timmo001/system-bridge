# System Bridge Docs

The System Bridge documentation site, built with Astro and Starlight. Published at <https://system-bridge.timmo.dev>.

## Commands

Run from `docs/`:

- `bun install` - install dependencies
- `bun run dev` - start the dev server
- `bun run build` - build the static site to `dist/`
- `bun run preview` - preview the production build

From the repo root you can also use the mise tasks:

- `mise run docs:dev`
- `mise run docs:build`

## Structure

Content lives in `src/content/docs/` and is exposed as routes based on file names. Site metadata and the sidebar live in `astro.config.mjs`.
