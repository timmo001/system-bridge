#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
mode="${1:?mode required}"
output_dir="${2:?output directory required}"

mkdir -p "$output_dir"

case "$mode" in
  development)
    cd "$repo_root"
    last_tag="$(git describe --tags --abbrev=0 2>/dev/null || printf '%s\n' 'v0.0.0')"
    base_version="${last_tag#v}"
    base_version="${base_version%%-*}"
    IFS=. read -r major minor patch <<<"$base_version"
    pkgver="${major:-0}.${minor:-0}.$((${patch:-0} + 1)).r$(git rev-list --count HEAD).g$(git rev-parse --short=7 HEAD)"

    install -m 0644 "$script_dir/PKGBUILD.dev" "$output_dir/PKGBUILD"
    sed -i "s/^pkgver=.*/pkgver=${pkgver}/" "$output_dir/PKGBUILD"
    ;;
  stable)
    tagver="${3:?tag version required}"
    pkgver="${tagver#v}"
    pkgver="${pkgver//-/.}"

    install -m 0644 "$script_dir/PKGBUILD.release" "$output_dir/PKGBUILD"
    sed -i "s/^pkgver=.*/pkgver=${pkgver}/" "$output_dir/PKGBUILD"
    sed -i "s/TAGVER_PLACEHOLDER/${tagver}/" "$output_dir/PKGBUILD"

    source_dir="$(mktemp -d)"
    trap 'rm -rf -- "$source_dir"' EXIT
    sha256sums="$(cd "$output_dir" && SRCDEST="$source_dir" makepkg -g)"
    SHA256SUMS="$sha256sums" perl -0pi -e 's/^sha256sums=.*$/$ENV{SHA256SUMS}/m' "$output_dir/PKGBUILD"
    ;;
  *)
    echo "Unsupported AUR package mode: ${mode}" >&2
    exit 1
    ;;
esac

grep -Fxq "pkgver=${pkgver}" "$output_dir/PKGBUILD"
if grep -q 'TAGVER_PLACEHOLDER\|pkgver=5.0.0+dev' "$output_dir/PKGBUILD"; then
  echo "AUR package placeholders remain in ${output_dir}/PKGBUILD" >&2
  exit 1
fi

echo "Prepared ${mode} AUR package ${pkgver} in ${output_dir}"
