---
name: system-bridge-services
description: Show a service, timer, scheduled job, backup, sync or health check in System Bridge's services, through a services provider. Use when creating or changing a long-running service, systemd timer, cron or scheduled job, backup, sync or status check on a computer that runs System Bridge, to offer showing it there, or when asked to show something in System Bridge's Services page, add a services provider or give an item actions.
---

# System Bridge services

System Bridge doesn't watch services itself. It reads them from providers: commands set in `settings.json` that print a version 1 provider document. Anything can be a provider, so this works for any tool, script or service manager. The [Services docs page](https://system-bridge.timmo.dev/features/services/) is the source of truth for the settings, the document's fields and actions; read it before writing a provider, rather than working from memory.

## Offer, don't assume

Showing something in System Bridge is optional.

- When you came here because you created or changed a service, job or check, first check that this computer runs System Bridge: the `system-bridge` Code Mode namespace is available, or `system-bridge` is on the `PATH`. If it doesn't, say nothing about it.
- If it does, ask the user once whether they want it shown in System Bridge, alongside your other questions. Add nothing unless they say yes, and don't ask again for the same thing.
- When the user asked for it directly, go ahead.

## Choose the route

Read what's already set up first: the providers in `services.providers` of `settings.json` in the [settings directory](https://system-bridge.timmo.dev/running/#file-locations), and the items they report (below).

1. **An existing provider can take it.** Some providers register items themselves, such as dot, where each job adds a YAML descriptor to `~/.config/dot/services.d/` (`dot services --help` has the fields). Register the new item there, shipped with whatever owns the job. This needs no settings change.
2. **The tool already reports its own status.** If it can print the provider document, or a short wrapper can turn its status output into one, use that as the provider.
3. **Otherwise, write a small provider script** that prints the document, as in the docs' example provider. Keep it with what it watches (the same repository or dotfiles package), not loose in a home directory.

Prefer one provider reporting several related items to one provider per item.

## Writing a provider

- `list` and `act` are a program and its arguments, run without a shell. Use a full path: a service's `PATH` can be shorter than your shell's.
- `list` must finish within 15 seconds and print under 1 MB. It runs once a minute, so keep it cheap: read state or a cached result, don't do the work.
- Item IDs are what clients and Home Assistant key on. Pick stable ones and don't rename them later.
- Pick the `health` that says what the user should do: `failed` needs them, `stale` means it hasn't reported in time, `warning` and `degraded` are worth a look, `ok` and `running` aren't. Set `busy` and `progress` only while work is under way.
- Add `actions` only for things worth pressing from a client, such as "Run now". System Bridge appends the item and action IDs to `act`; the `act` command must check both again itself. Give anything slow, costly or destructive a `confirm` question.

## Changing the settings

A provider runs any command it names, so only `settings.json` can set one. Show the user the exact entry you'll add and ask before writing it, even when they asked for the item. System Bridge rereads the file within a minute, so no restart is needed.

## Check it

1. Run the `list` command yourself and check it prints valid JSON with `"version": 1` and your item.
2. Within a minute, read the services through System Bridge: the `system-bridge` Code Mode namespace's services tool, the MCP tool `system_bridge_list_services`, or `system-bridge client services list --json`. Check the item's health and summary, and that the provider has no `error` and `errors` names nothing of yours.
3. If you added an action, run it only when the user agrees, as it does real work.
