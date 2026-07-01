# System Bridge Docs - Agent Guide

This directory holds the System Bridge documentation site built with Astro + Starlight.
Keep changes small, aligned with existing patterns, and focused on content and UI.

## Quick Commands

Run from `docs/`:

- Install deps: `bun install`
- Dev server: `bun run dev` (alias: `bun run start`)
- Build: `bun run build`
- Preview build: `bun run preview`
- Astro CLI: `bun run astro -- --help`

From the repo root: `mise run docs-dev`, `mise run docs-build`.

## Lint / Test

- No lint script is configured in `package.json`.
- No tests are configured in this repo.
- Running a single test is not applicable here.
- If you add lint/tests, update `package.json` and this file with exact commands.

## Package Manager

- Use `bun` only (matches the rest of the System Bridge monorepo).
- Do not add npm/yarn/pnpm commands to docs or scripts.

## Tech Stack

- Astro 6.x with Starlight docs.
- Tailwind CSS with `tailwindcss-fluid-type`.
- `astro-icon` for SVG icons.
- Static output site; no server runtime in this repo.

## Repo Layout

- Docs content: `src/content/docs/` (Markdown/MDX with frontmatter).
- UI components: `src/components/` (.astro).
- Layouts: `src/layouts/`.
- Styles: `src/styles/` and component `<style>` blocks.
- Public assets: `public/`.
- Build output: `dist/` (generated; do not edit).

## Content Authoring (Always On)

- Use YAML frontmatter; include `title` and `description` when available.
- File names in `src/content/docs/` are kebab-case and map to routes.
- Keep headings in natural order (H2 under page title).
- Use Starlight callouts: `:::note`, `:::tip`, `:::caution`, `:::danger`.
- External links should include `target="_blank"` and `rel="noopener noreferrer"` when in Astro/MDX.
- Use language tags on code fences (e.g. `bash`, `json`, `ts`).
- Prefer short, action-oriented paragraphs; avoid wall-of-text updates.

## Astro / MDX Patterns

- Keep imports and data in the frontmatter block (`---`).
- Use ESM imports only.
- For icons, use `Icon` from `astro-icon/components`.
- When linking within docs, use absolute `/docs/...` paths.
- Preserve existing component structures unless refactors are required.

## Client Scripts (Astro)

- Place client scripts near the end of the component.
- Guard DOM lookups (`querySelector`) before use.
- Prefer `addEventListener` over inline handlers.
- Keep scripts small; do not introduce heavy client logic.
- Avoid global side effects unless the component already does so.

## Tailwind + CSS

- Prefer Tailwind utility classes for layout/spacing/typography.
- Use CSS variables already defined in the theme (see `tailwind.config.cjs`).
- Use `<style>` blocks for small component-scoped rules only.
- Avoid adding new global CSS unless necessary; keep it in `src/styles/`.

## Images and Assets

- Store shared assets in `src/assets/`.
- Reference assets with relative paths from MDX frontmatter when needed.
- Provide descriptive `alt` text for images.
- Prefer optimized formats (SVG/WEBP) when adding new assets.

## Imports

- Order imports: external packages first, then local files.
- Use relative paths for local imports; no path aliases are configured.
- Match the quote style used in the file you are editing.

## Formatting

- Match existing indentation and whitespace in the file.
- Do not reformat unrelated lines or reorder content without need.
- Keep JSX/MDX attributes on multiple lines when already split.

## Workspace Hygiene

- Avoid editing generated output like `dist/`.
- Do not touch `node_modules/`.
- Keep changes focused; avoid broad refactors.
- Preserve content order unless a change requires reflow.

## Docs Routing

- Nested doc routes map to nested folders (e.g. `websocket/open-url.md`).
- Keep slugs consistent with sidebar labels and internal links.
- Use `/docs/...` for internal links in prose.

## Types and Error Handling

- Astro uses strict TS config; keep types explicit in scripts when needed.
- Guard DOM queries with null checks or optional chaining.
- Avoid throwing in client scripts; fail quietly for missing elements.

## Naming Conventions

- Components: `PascalCase.astro` (e.g. `LandingCard.astro`).
- Docs files: kebab-case (e.g. `open-url.md`).
- IDs/classes: descriptive and consistent with existing patterns.

## Accessibility

- Provide alt text for images and icons used as images.
- Buttons/interactive icons need `aria-label`.
- Ensure focusable elements remain keyboard-accessible.

## Quality Checks

- Run `bun run dev` for quick visual verification.
- Run `bun run build` before publishing changes that touch layout or config.
- Confirm nav links and sidebar entries resolve correctly.

## Updating Navigation

- Sidebar and site metadata live in `astro.config.mjs`.
- Keep sidebar labels human-readable and slugs consistent with doc routes.

## Cursor / Copilot Rules

- No Cursor rules found in `.cursor/rules/` or `.cursorrules`.
- No Copilot instructions found in `.github/copilot-instructions.md`.

## Project Skills (Use for Infrequent Tasks)

Docs workflows live as project skills in the repo root at `.agents/skills/` and
load on demand:

- `docs-page-workflow` - add or restructure a Starlight docs page
- `landing-content-updates` - edit the landing page content

Keep this file focused on always-needed guidance. Move rare workflows to skills.
