---
name: home-assistant-frontend
license: Apache-2.0
compatibility: Designed for Home Assistant frontend source, and custom cards and dashboards, with the frontend's ha-frontend-* skills available.
description: Home Assistant frontend skill routing and personal engineering overlays. Use only when editing or reviewing code inside a Home Assistant frontend (home-assistant/frontend) checkout or a Home Assistant custom card or dashboard repository, so the frontend's `ha-frontend-*` skills stay authoritative and applicable Lit, TypeScript, cleanup, and HA companion skills are also loaded.
---

# Home Assistant Frontend

Use this skill only inside a Home Assistant frontend (`home-assistant/frontend`) checkout or a Home Assistant custom card or dashboard repository. Do not apply it to other projects. It routes to the frontend's own guidance and adds only cross-project engineering preferences.

## Primary Source of Truth

The frontend repository owns Home Assistant implementation conventions through its `AGENTS.md` and `.agents/skills/ha-frontend-*` skills. Custom card and dashboard repositories link the applicable `ha-frontend-*` skills from a `vendor/home-assistant-frontend` submodule:

1. Read the repository's applicable instructions before editing or reviewing.
2. Discover and load every applicable `ha-frontend-*` skill based on its description.
3. Treat those skills as authoritative for components, contexts, styling, testing, user-facing text, and review conventions. In custom cards and dashboards, the repository's own instructions win where they differ, for example on build tooling or public custom element APIs.
4. Do not replace repository guidance with a global pattern or copy repository conventions into this skill.

## When to Apply

Inside a Home Assistant frontend checkout or a custom card or dashboard repository, when:

- Editing or reviewing its files
- Reviewing or writing `ha-*` prefixed Web Components
- Working with HA dialogs, panels, Lovelace cards, or selectors
- Applying HA localization, theming, or design token patterns

## Personal Overlay

Layer these global skills over the repository guidance when their scopes apply:

- applicable `home-assistant-*` specialists for cross-repository workflows;
- applicable `lit-*` skills for Lit concerns;
- applicable `*-ts` skills before editing or reviewing TypeScript;
- `cleanup-*` and `remove-single-use-*` skills whenever their safe code-quality rules apply.

For Home Assistant rendering or picker work, load both `lit-rendering` and `home-assistant-lit-rendering`. Preserve the stricter TypeScript and cleanup guidance unless it conflicts with an explicit repository rule.

`ha-frontend-review` owns scope, async state, readiness, and memo invalidation rules, and `ha-frontend-testing` owns test and dev server rules. Add only these preferences, without overriding explicit repository rules:

### Lifecycle

- Model logical open and close lifecycle independently from DOM connection when managers can retain closed elements. Global-listener registration must be idempotent or return a cleanup handle.

### Processes And Input (`build-scripts/` and similar tooling)

- Make check-then-act filesystem and PID operations atomic. Locks must cover every mutated shared resource, including watcher regeneration.
- Terminate processes with SIGTERM, wait and verify exit, then escalate to SIGKILL. Remove process state only after confirmed exit and guard against stale PID reuse.
- Handle child `spawn` and `error` events, and treat null or unknown exit codes as failures.
- Reject contradictory or malformed CLI and configuration values with a positive grammar rather than permissive suffix checks.

### Test Boundaries

- Apply `testing` alongside `ha-frontend-testing`.
- Keep maintenance of existing test infrastructure in dedicated work. Install error tracking before navigation and never let report-merging failures suppress the original failed-suite result.

## Sibling Repositories

The Home Assistant core, documentation, custom cards, custom dashboards, and core packages commonly live alongside the frontend. When working across repositories, reference the available sibling checkout directly rather than guessing APIs or conventions. Follow each target repository's own instructions and skills.

### Core (`../core`)

- Read the Core repository instructions when the frontend change involves backend APIs, WebSocket commands, entity models, or integration data structures.
- Reference core source (e.g. `homeassistant/components/<integration>/`) to understand data shapes, service schemas, and WebSocket API handlers before consuming them in frontend code.
- When adding or modifying frontend calls to backend APIs, verify the API exists in core and match parameter names, types, and response shapes to the core implementation.
- If asked to make changes that span both frontend and core (new WebSocket command, new entity feature), work in both repos and follow each repo's own `AGENTS.md` for its conventions.

### User Docs (`../home-assistant.io`)

- Read the user documentation repository instructions when asked to create or update user-facing documentation.
- Documentation for new frontend features, integrations, or UI changes goes here.
- Follow the documentation repository's writing style rather than imposing global frontend copy guidance.
- When a frontend change adds user-visible functionality, remind that corresponding docs may be needed and offer to create them following the docs repo's conventions.

### Contributor Docs (`../contributors.home-assistant.io`)

- contributors.home-assistant.io replaces developers.home-assistant.io, design.home-assistant.io and data.home-assistant.io; the old `developers.home-assistant` repository is archived and its links redirect.
- The `/frontend/` area covers frontend development, custom cards and dashboards; `/design/` covers components, patterns and UI text with live frontend components; `/glossary/` gives each term's current name in code and UI, and its former names (service to action, add-on to app, Lovelace to dashboard).
- The blog at `/blog/` announces frontend and Core API changes. Use it to find what changed, then confirm in the frontend and Core source, which win where they differ.
- Pages live in `src/content/docs/<area>/` and blog posts in `src/content/blog/`. Read them in the sibling checkout, or in `home-assistant/contributors.home-assistant.io` on GitHub when there is none. For the published site as an agent, start at `https://contributors.home-assistant.io/llms.txt` or `/<area>/llms.txt`, and add `index.md` to a page URL for its Markdown.
- When creating or updating contributor documentation for custom card APIs, dashboard strategies, frontend development guides or design components, work in this repo.
- Discover and follow that repository's `AGENTS.md` and repo-local skills (`.claude/skills/`) before making changes.
