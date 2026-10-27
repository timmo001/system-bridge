#!/usr/bin/env bash
# Run by the post-commit hook mise generates (mise run install:hooks). After a
# commit that changes Go or Bun dependencies, refresh the Nix package's
# dependency hashes and commit them, so the Nix build on dev keeps working.
# Renovate's pull requests get theirs from the Nix workflow instead.
set -euo pipefail

# The hash commit itself, and commits replayed by a rebase, are left alone
if [ -n "${SYSTEM_BRIDGE_NIX_HASHES:-}" ] ||
  [ -d "$(git rev-parse --git-path rebase-merge)" ] ||
  [ -d "$(git rev-parse --git-path rebase-apply)" ]; then
  exit 0
fi

if ! git diff-tree --no-commit-id --name-only -r HEAD |
  grep -qE '^(go\.(mod|sum)|bun\.lock|(.+/)?package\.json)$'; then
  exit 0
fi

package="nix/package.nix"
if ! git diff --quiet HEAD -- "$package"; then
  echo "Dependencies changed, but $package has uncommitted edits, so its hashes weren't refreshed. Run mise run nix:hashes." >&2
  exit 0
fi

echo "Dependencies changed, so refreshing the Nix package's hashes"
if ! .scripts/linux/update-nix-hashes.sh; then
  echo "Couldn't refresh the Nix hashes. Run mise run nix:hashes, and commit $package." >&2
  exit 0
fi

if git diff --quiet -- "$package"; then
  exit 0
fi
SYSTEM_BRIDGE_NIX_HASHES=1 git commit --no-verify --quiet -m "Update Nix dependency hashes" -- "$package"
echo "Committed the new Nix hashes"
