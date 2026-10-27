#!/usr/bin/env bash
# Build the Nix package, replacing each dependency hash in nix/package.nix
# that no longer matches with the one Nix reports, until it builds.
set -euo pipefail

package="nix/package.nix"

for _ in 1 2 3; do
  if output=$(nix build .#default --no-link -L 2>&1); then
    echo "Nix package builds"
    exit 0
  fi

  specified=$(grep -oP 'specified: +\Ksha256-\S+' <<<"$output" | head -n 1 || true)
  got=$(grep -oP 'got: +\Ksha256-\S+' <<<"$output" | head -n 1 || true)

  if [ -z "$specified" ] || [ -z "$got" ]; then
    echo "$output"
    echo "The Nix build failed for a reason other than a stale hash" >&2
    exit 1
  fi

  echo "Replacing $specified with $got"
  sed -i "s|$specified|$got|" "$package"
done

echo "The Nix package still doesn't build after updating its hashes" >&2
exit 1
