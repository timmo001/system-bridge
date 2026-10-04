---
name: skill-prefixes
license: Apache-2.0
description: Name skills with an owner prefix so they do not collide with shared, imported or other repositories' skills. Use when creating, renaming, importing or reviewing a skill name, especially for repository-local or tool-owned skills.
---

# Skill Prefixes

Skill names share one namespace once they are installed globally, synced into
other repositories, or loaded alongside a repository's own skills. A bare name
such as `review`, `docs` or `release` will eventually clash.

## Prefix internal skills

- Prefix every skill a repository or tool you own defines for itself with that
  owner's short name and a hyphen: `upnext-release`, `ha-bridge-commands`,
  `context-cli`, `notes-mcp`, `dot-git-commit`.
- Use the name people already call the tool, usually its CLI or package name,
  not the GitHub owner. Keep it short and use the same prefix for every skill
  from that owner.
- A skill that mainly wraps a tool's commands takes that tool's prefix even when
  it lives in another repository: skills built on the `dot` CLI use `dot-`.
- Keep the rest of the name specific to the job: `upnext-review`, not
  `upnext-skill`.

## Leave these alone

- Shared, general-purpose skills meant for any repository (`testing`,
  `code-review`, `writing-style`) stay unprefixed. They are the base names
  everything else avoids.
- Skills in repositories you do not control keep upstream's naming. Home
  Assistant's `ha-frontend-*` already prefixes; HA core's `bump-dependency`
  does not, and that is upstream's call. Do not rename them in place.
- External imports keep their upstream name, since project-copy syncing relies
  on it. Rename an import only when it actually clashes with an existing skill,
  and record the original under `sourceName` in `imports.json`.

## Renaming

- Keep `name` equal to the directory name.
- Update every caller in the same change: AGENTS files, commands, agent
  definitions, other skills, plugin prompts, and generated catalogues. Search
  for the bare name in backticks and in phrases like "load" or "apply", and
  leave matching command or service names alone.
- Rename the source; installed or synced copies follow on their next update.
