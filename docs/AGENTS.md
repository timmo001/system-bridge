# System Bridge Docs - Agent Guide

This directory holds the System Bridge documentation site, built with Blume and `@timmo001/docs-kit`. Keep changes focused on content, and keep shared layout, theme and config changes in the docs-kit repository rather than copying them here.

## Commands

Run from `docs/`:

- Install deps: `bun install` (the docs are part of the root Bun workspace)
- Build: `bun run build` (strict: fails on content errors)
- Check links and anchors: `bun run validate`
- Preview the build: `bun run preview`
- Regenerate brand images: `bun run brand`
- Validate the Worker upload: `bun run deploy --dry-run`

From the repo root: `mise run docs:build`, `mise run docs:validate` and `mise run docs:lint`. From an agent, start the dev server in the background with `mise run serve:docs`; it is at `https://docs.system-bridge.localhost`. While it runs, `blume build` refuses to run, so use `bun run build --isolated` to check a change. Use `mise run docs:dev` only for foreground debugging.

## Stack

- Blume (Astro-based) with `@timmo001/docs-kit` for the config, home banner, header GitHub link and theme.
- Server output on Cloudflare Workers, so the docs MCP server at `/mcp` works. `llms.txt`, `llms-full.txt` and a Markdown copy of each page are generated too.
- Bun only. Pin dependencies to exact versions.

## Layout

- Content: `src/content/docs/` (Markdown and MDX with frontmatter). File names are kebab-case and map to routes.
- Site details, sidebar and redirects: `blume.config.ts`.
- Layout components: `components.ts`. Blume reads it without running it, so import components there directly.
- Theme: `theme.css`, which starts with docs-kit's theme import.
- Logos: `public/logo-light.svg` and `public/logo-dark.svg` for the header and banner, `src/assets/logo.svg` for share cards and brand images.
- Generated: `.blume/`, `.blume-verify/` and `dist/`. Never edit them.

## Writing pages

- Frontmatter needs `title` and `description`.
- Start headings at `##`, in order.
- Callouts (`:::note`, `:::tip`, `:::warning`, `:::danger`) and components only render in `.mdx` files. Use `.mdx` for any page that needs them.
- Components need no imports: `Card`, `CardGroup`, `Tabs` and `Tab`, `Steps` and `Step`, `Badge` and more. Icons are Lucide names, such as `terminal` or `gauge`.
- Internal links are root-relative, such as `/features/commands` or `/api/websocket/control#media-control`. `bun run validate` checks them.
- External links open in a new tab automatically.
- Tag every code fence with a language. Put a title after it, such as ` ```ini title="~/.config/autostart/system-bridge.desktop" `.
- Write in plain UK English, with no em-dashes.

## Navigation

- Add every new page to the sidebar in `blume.config.ts`.
- When a page moves or is renamed, add a redirect from its old route in `blume.config.ts`.

## Project skills

- `system-bridge-docs-page-workflow` - add or restructure a docs page
- `system-bridge-landing-content-updates` - edit the home page
