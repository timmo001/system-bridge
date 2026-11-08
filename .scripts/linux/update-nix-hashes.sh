#!/usr/bin/env bash
# Build the Nix package's dependency derivations, replacing each hash in
# nix/package.nix that no longer matches with the one Nix reports, until they
# build. Only the Go modules and web client modules are built, as they're what
# the hashes pin, so this neither compiles System Bridge nor needs new files
# committed. Without
# Nix installed, mise fetches nix-portable, which runs Nix rootless in a user
# namespace with its store in ~/.nix-portable, so it needs neither root nor
# Docker, and later runs only fetch what changed.
set -euo pipefail

package="nix/package.nix"
nix_portable="github:DavHau/nix-portable@v012"

targets=(.#default.goModules .#default.webClientModules)

nix_build() {
  if command -v nix >/dev/null; then
    nix build "${targets[@]}" --no-link -L
    return
  fi
  mise exec "$nix_portable" -- nix-portable nix \
    --extra-experimental-features "nix-command flakes" \
    build "${targets[@]}" --no-link -L
}

for _ in 1 2 3; do
  if output=$(nix_build 2>&1); then
    echo "The Nix dependency hashes are current"
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

echo "The Nix dependencies still don't build after updating their hashes" >&2
exit 1
