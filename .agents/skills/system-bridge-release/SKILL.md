---
name: system-bridge-release
description: Release System Bridge and its Python and TypeScript connectors. Use when preparing or publishing a GitHub release, choosing the next version, checking what a release published (release assets, PyPI, npm, JSR, the Arch package repository and AUR), checking the connectors for drift from the backend, or debugging the release jobs in build-and-package-application.yml.
---

# Releasing System Bridge

One version covers the application, the Python connector (`systembridgeconnector`) and the TypeScript connector (`@timmo001/effect-system-bridge`). Publishing a non-prerelease GitHub release runs `.github/workflows/build-and-package-application.yml`, which builds and publishes everything at once.

Releasing is a public, irreversible publish. Create a tag or release only when the user asks, and use their chosen version.

## Versions

- Tags are the exact version with no `v` prefix, as in `5.11.1`.
- Nothing needs bumping before a release. The Go binary gets its version from the tag at build time (`.github/scripts/bash/get-version.sh`), and CI writes the tag into `connector/python/pyproject.toml` and the TypeScript connector's `package.json` and `jsr.json`, whose committed versions stay `0.0.0`.
- The Omarchy plugin (`omarchy-plugin/manifest.json`) and the docs site are versioned and deployed separately, so a release doesn't change them.
- Patch for fixes and quiet changes, minor for new features or modules. Large moves of existing code, such as importing the connector, are still patch.

## Release

Check `dev` has passed CI first, especially Build and package application, so the release builds the same commit that passed.

### Connector drift

Both connectors ship with the release, so check they match the backend first:

```bash
mise run drift:connectors
```

It regenerates the TypeScript module data schemas and fails if that changes them, then runs `tools/check-connector-drift`. That lists the events, replies, error subtypes and modules a connector doesn't know or still knows after the backend dropped them, the events and replies each client never sends or handles, and the fields of the hand-written models (Python module data, both connectors' settings and requests) that differ from the Go structs. A `+field` is only in the backend, a `-field` only in the connector.

Bring each connector in line, or, when a difference is deliberate, add it with a reason to the tool's `unhandledReplies`, `ignoredFields` or `handlerPairs`. A new request struct in `event/handler` needs a `handlerPairs` entry before the check passes. It reads declarations, so it can't catch behaviour such as a timeout shorter than the backend allows; compare the clients by hand for changes like that. Run it until it reports no drift, and commit the fixes before the release.

### Notes

Write the release notes by hand rather than using GitHub's generated list. Read `git log <previous version>..<dev commit>` and the previous releases (`gh release view <version> --json body -q .body`), and follow the `writing-style` skill. Match their shape:

- One or two sentences on what the release does. Say "No changes to the application" when that's true.
- `##` sections by area (a module such as `Discord`, a platform such as `Linux`, `CLI`, `Connector`, `Docs`), then `Moved` for anything that breaks automations, `Dependencies` and `Maintenance`.
- Bullets that start with a verb and name real identifiers in backticks. Link PRs as `(#1234)` and the docs pages for new features.
- Credit first-time contributors under `New contributors`.
- End with `**Full Changelog**: https://github.com/timmo001/system-bridge/compare/<previous version>...<version>`.

### Publish

Create the release at the checked commit:

```bash
gh release create <version> --target <dev commit sha> --title <version> --notes-file notes.md
```

When the maintainer's `dot git releases` helper is available, use it instead: it compares `dev` with the last stable release, suggests an impact, and tags and publishes from a reviewed snapshot. Pass the same notes file.

```bash
dot git releases --repo timmo001/system-bridge --refresh
dot git releases review --repo timmo001/system-bridge --snapshot <id> --finding <id> --impact patch   # override a suggestion
dot git releases publish --repo timmo001/system-bridge --snapshot <id> --notes-file notes.md --notes-mode replace   # preview the plan
dot git releases publish --repo timmo001/system-bridge --snapshot <id> --notes-file notes.md --notes-mode replace --confirm <plan>
```

Its suggestion counts large added source as minor. Review those findings down to patch when the code isn't new behaviour.

To fix notes after publishing, `gh release edit <version> --notes-file notes.md`.

## What a stable release publishes

All of this comes from the `release` jobs in `build-and-package-application.yml`:

- **Release assets**: the deb, rpm, Flatpak, Windows installer and the Linux and Windows archives that mise installs, with a sigstore bundle (`update-release`)
- **Arch**: the `system-bridge` package (epoch `2:`), built and attached to the release with its own sigstore bundle, then dispatched to `timmo001/arch-repo` for the signed `timmo` pacman repository (`build-arch-package-stable`, `attach-arch-package-stable`)
- **AUR**: `system-bridge` (`update-aur-stable`)
- **PyPI**: `systembridgeconnector`, built from `connector/python` with the tag as its version (`build-connector-python`, `publish-connector-python`)
- **npm and JSR**: `@timmo001/effect-system-bridge`, from `connector/typescript` with the tag as its version, through the shared `timmo001/workflows` publish workflows (`publish-connector-typescript-npm`, `publish-connector-typescript-jsr`)

A prerelease only attaches assets. `system-bridge-git` publishes from pushes to `dev`, not from releases.

## Sense checks

These jobs have passed on every recent release, so don't wait for them each time. Check they've started, then look back later or when something seems off:

```bash
gh run list -R timmo001/system-bridge --event release --limit 1    # the release run
gh release view <version> -R timmo001/system-bridge --json assets -q '.assets[].name'
curl -s https://pypi.org/pypi/systembridgeconnector/json | jq -r .info.version
npm view @timmo001/effect-system-bridge version
curl -s https://jsr.io/@timmo001/effect-system-bridge/meta.json | jq -r .latest
gh run list -R timmo001/arch-repo --limit 3                         # "Publish system-bridge" dispatch
curl -s https://aur.archlinux.org/rpc/v5/info/system-bridge | jq -r '.results[0].Version'
```

A finished release has nine assets: `system-bridge-2.<version>-1-x86_64.pkg.tar.zst`, `system-bridge-<version>-1.x86_64.rpm`, `system-bridge_<version>_amd64.deb`, `system-bridge-<version>.flatpak`, `system-bridge-<version>-linux-x86_64.tar.gz`, `system-bridge-<version>-setup.exe`, `system-bridge-<version>-windows-x86_64.zip`, `system-bridge-<version>.sigstore.json` and `system-bridge-<version>-arch.sigstore.json`. PyPI, npm, JSR and the AUR show the new version once their jobs finish. The Home Assistant dashboard gets a release with the same tag in `timmo001/system-bridge-dashboard`, with `system-bridge-dashboard.js` and `system-bridge-dashboard-<version>.sigstore.json` as its only assets.

## Setup

These live outside the repository and only need redoing when they break or are rotated:

- `AUR_SSH_PRIVATE_KEY` and `ARCH_REPO_DISPATCH_TOKEN` repository secrets. The `arch-repo-dispatch-secret` skill rotates the dispatch token.
- A PyPI trusted publisher on `systembridgeconnector` for `timmo001/system-bridge`, workflow `build-and-package-application.yml`, no environment.
- An npm trusted publisher on `@timmo001/effect-system-bridge` for `timmo001/system-bridge`, workflow `build-and-package-application.yml`, and the JSR package linked to `timmo001/system-bridge`. The `npm-jsr-first-publish` skill sets both up before the first release.

## After a release

Install only published packages, from the signed `timmo` pacman repository, never a local build. Check with `pacman -Qo "$(command -v system-bridge)"`.
