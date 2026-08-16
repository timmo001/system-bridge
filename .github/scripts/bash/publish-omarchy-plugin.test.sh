#!/usr/bin/env bash

set -euo pipefail

repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd)
publisher="$repo_root/.github/scripts/bash/publish-omarchy-plugin.sh"
test_root=$(mktemp -d)
trap 'rm -rf "$test_root"' EXIT

source_dir="$test_root/source"
publish_dir="$test_root/publish"
mkdir -p "$source_dir" "$publish_dir"
git -C "$publish_dir" init --quiet

for file in BarWidget.qml FilterablePanel.qml Panel.qml README.md Service.qml manifest.json; do
  printf '%s\n' "$file" >"$source_dir/$file"
done
printf 'stale\n' >"$publish_dir/stale"

"$publisher" "$source_dir" "$publish_dir"

test -d "$publish_dir/.git"
test ! -e "$publish_dir/stale"
test -f "$publish_dir/LICENSE"
for file in BarWidget.qml FilterablePanel.qml Panel.qml README.md Service.qml manifest.json; do
  cmp "$source_dir/$file" "$publish_dir/$file"
done

ln -s README.md "$source_dir/preview.png"
if "$publisher" "$source_dir" "$publish_dir" >/dev/null 2>&1; then
  printf 'Publisher accepted a symbolic link.\n' >&2
  exit 1
fi

printf 'Omarchy plugin publisher tests passed\n'
