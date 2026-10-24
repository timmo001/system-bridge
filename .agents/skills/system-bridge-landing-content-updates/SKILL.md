---
name: system-bridge-landing-content-updates
description: Update the System Bridge docs home page, built with Blume and @timmo001/docs-kit. Use when editing docs/src/content/docs/index.mdx, its cards, the home banner, or the logos and brand images.
---

# Home Page Updates

Use when changing the docs home page at `/`.

## Where to edit

- Content: `docs/src/content/docs/index.mdx`. Its `title` and `description` show in the home banner.
- Banner: docs-kit's `HomeBanner`, added in `docs/components.ts`. Size it with the `--home-banner-*` properties in `docs/theme.css`. Change the banner itself in the docs-kit repository.
- Logos: `docs/public/logo-light.svg` and `docs/public/logo-dark.svg`. Share cards and brand images use `docs/src/assets/logo.svg`; run `bun run brand` from `docs/` after changing it, and upload `.github/social-preview.png` in the repository settings by hand.

## Patterns

- Group links into sections of `Card`s in a `CardGroup`. Every card links somewhere, usually a feature or using page.
- Icons are Lucide names, such as `gauge`, `terminal` or `headphones`.
- Use a table for lists that don't link anywhere, such as the modules.

```mdx
<CardGroup cols={3}>
  <Card title="Monitoring" href="/features/monitoring" icon="gauge">
    Watch CPU, memory, disks, networks, sensors and more.
  </Card>
</CardGroup>
```

## Copy

- Keep each card to a sentence about what the reader can do.
- Write in plain UK English, with no em-dashes or marketing tone.

## Check it

With `mise run serve:docs` running, open `https://docs.system-bridge.localhost/` at desktop and phone widths, in light and dark mode. Then build with `bun run build --isolated` from `docs/`.
