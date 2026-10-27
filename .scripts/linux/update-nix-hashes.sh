#!/usr/bin/env bash
# Build the Nix package's dependency derivations, replacing each hash in
# nix/package.nix that no longer matches with the one Nix reports, until they
# build. Only the Go modules and web client modules are built, as they're what
# the hashes pin, so this neither compiles System Bridge nor needs new files
# committed. Without
# Nix installed, Nix runs in Docker, keeping its store in a volume so later
# runs only fetch what changed. When the user can't reach Docker themselves,
# Docker runs through pkexec, which asks for authorisation.
set -euo pipefail

package="nix/package.nix"

docker=(docker)
if ! command -v nix >/dev/null && ! docker info >/dev/null 2>&1; then
  docker=(pkexec "$(command -v docker)")
fi

targets=(.#default.goModules .#default.webClientModules)

nix_build() {
  if command -v nix >/dev/null; then
    nix build "${targets[@]}" --no-link -L
    return
  fi
  "${docker[@]}" run --rm \
    --volume "$PWD:/src:ro" \
    --volume system-bridge-nix:/nix \
    --workdir /src \
    nixos/nix \
    sh -c 'git config --global --add safe.directory /src && nix --extra-experimental-features "nix-command flakes" build "$@" --no-link -L' \
    sh "${targets[@]}"
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
