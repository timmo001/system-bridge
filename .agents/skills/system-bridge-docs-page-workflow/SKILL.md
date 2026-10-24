---
name: system-bridge-docs-page-workflow
description: Add or restructure a page in the System Bridge docs site under docs/, built with Blume and @timmo001/docs-kit - create the content file, set frontmatter, wire the sidebar and redirects, and check links. Use when adding, moving, or restructuring documentation pages in docs/src/content/docs/.
---

# Docs Page Workflow (Blume)

Use when adding or restructuring pages in the `docs/` site. Read `docs/AGENTS.md` first.

## Create a page

1. Add a kebab-case file in `docs/src/content/docs/`. Use `.mdx` if the page needs callouts or components, otherwise `.md`.
2. Give it frontmatter with `title` and `description`.
3. Start headings at `##`.

````mdx
---
title: Commands
description: Let clients run programs you choose on the machine running System Bridge.
---

:::warning
Anyone with your API token can run every command on the allowlist.
:::

```bash
system-bridge client token
```
````

Components need no imports. For example, cards linking onwards:

```mdx
<CardGroup cols={2}>
  <Card title="Monitoring" href="/features/monitoring" icon="gauge">
    Watch CPU, memory, disks and more.
  </Card>
</CardGroup>
```

Icons are Lucide names. Check a component's props in Blume's components docs through its docs MCP server when one is configured.

## Wire it up

1. Add the route to the sidebar in `docs/blume.config.ts`, in the right group:

   ```ts
   { label: "Features", items: ["/features/monitoring", "/features/commands"] }
   ```

2. When a page moves or is renamed, add a redirect from the old route in the same file:

   ```ts
   { from: "/settings/commands", to: "/features/commands" }
   ```

3. Link to it from related pages with root-relative links, such as `/features/commands#adding-a-command`.

## Check it

From the repo root:

```bash
mise run docs:build
mise run docs:validate
mise run docs:lint
```

If the dev server is running through `mise run serve:docs`, build with `bun run build --isolated` from `docs/` instead, and view the page at `https://docs.system-bridge.localhost`.
