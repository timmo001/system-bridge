#!/usr/bin/env bash

set -euo pipefail

source_dir=${1:-client/home-assistant/frontend}
publish_dir=${2:?Usage: publish-home-assistant-dashboard.sh [source-dir] publish-dir}
repository_root=$(git rev-parse --show-toplevel)
license="$repository_root/LICENSE"
resource=system-bridge-dashboard.js

fail() {
  printf 'publish-home-assistant-dashboard: %s\n' "$*" >&2
  exit 1
}

[[ -d $source_dir ]] || fail "source directory does not exist: $source_dir"
[[ -d $publish_dir/.git || -f $publish_dir/.git ]] || fail "publish directory is not a Git checkout: $publish_dir"
[[ -f $license && ! -L $license ]] || fail "repository licence must be a regular file: $license"

for file in hacs.json README.md "dist/$resource"; do
  [[ -f $source_dir/$file && ! -L $source_dir/$file ]] || fail "required source file is missing or not regular: $source_dir/$file"
done

find "$publish_dir" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf -- {} +
mkdir -p "$publish_dir/dist"
cp -- "$source_dir/hacs.json" "$source_dir/README.md" "$publish_dir/"
cp -- "$license" "$publish_dir/LICENSE"
cp -- "$source_dir/dist/$resource" "$publish_dir/dist/$resource"

mapfile -t published_files < <(cd "$publish_dir" && find . -path ./.git -prune -o -type f -printf '%P\n' | LC_ALL=C sort)
expected_publish=(LICENSE README.md "dist/$resource" hacs.json)
[[ ${published_files[*]} == "${expected_publish[*]}" ]] || fail "published repository contains unexpected files: ${published_files[*]}"
