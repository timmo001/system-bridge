---
name: landing-content-updates
description: Update the System Bridge marketing landing page in the Astro + Starlight docs site. Use when editing the landing page (docs/src/content/docs/index.mdx), its LandingCard/CardGrid components, or the landing styles.
---

# Landing Content Updates

Use when adjusting the marketing landing page content.

## Where to Edit

- Landing page content: `docs/src/content/docs/index.mdx`.
- Custom components: `docs/src/components/` (e.g. `LandingCard.astro`).
- Landing styles: `docs/src/styles/landing.css`.

## Common Patterns

- Use `CardGrid` + `LandingCard` for feature/module lists.
- Use `Icon` from `astro-icon/components` for icons.
- Keep external links with `target="_blank"` + `rel="noopener noreferrer"`.

## Example Card

```mdx
<LandingCard title="System Information">
  <Icon slot="icon" name="mdi:information-outline" />
  Access your system's information via the data modules using the API/WebSocket.
</LandingCard>
```

## Content Tips

- Keep copy short and descriptive.
- Prefer active voice and concrete benefits.
- Avoid changing layout structure unless required.

## Quick Local Check

Run `bun run dev` from `docs/` and verify the page at `/` on desktop and mobile widths.
