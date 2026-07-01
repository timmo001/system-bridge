---
name: docs-page-workflow
description: Add or restructure a page in the System Bridge Astro + Starlight docs site under docs/ - create the content file, set frontmatter, and wire the sidebar. Use when adding, moving, or restructuring documentation pages in docs/src/content/docs/.
---

# Docs Page Workflow (Starlight)

Use when adding or restructuring documentation pages in the `docs/` site.

## Create a New Page

1. Add a kebab-case file in `docs/src/content/docs/`.
2. Use YAML frontmatter with `title` and optional `description`.
3. Keep headings in order (H2 under the page title).
4. Use Starlight callouts (`:::note`, `:::tip`, `:::caution`, `:::danger`) for asides.
5. Use language tags on code fences.

Example:

````md
---
title: Open URL
description: Trigger a URL open action over WebSocket.
---

## Request

```json
{ "type": "open-url", "url": "https://example.com" }
```
````

## Update the Sidebar

1. Edit `docs/astro.config.mjs`.
2. Add an `items` entry under the correct section.
3. Use the slug path relative to `docs/src/content/docs/`.

```js
{ label: 'Open URL', slug: 'api/websocket/control' }
```

## Link Conventions

- Internal links use root-relative slug paths, e.g. `/api/websocket/control/` or `/using/cli/`. Do **not** use `/docs/...` (legacy, redirected).
- External links in MDX: include `target="_blank"` and `rel="noopener noreferrer"`.

## Quick Local Check

Run `bun run dev` from `docs/` and open the page route to verify layout and headings.
