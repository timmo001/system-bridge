#!/usr/bin/env bash
# Build a single Linux package (arch, deb, rpm or flatpak) from the prebuilt
# binaries using the matching .scripts/linux/create-<package>.sh helper.
#
# Usage: package-linux.sh <package>
set -euo pipefail

package="${1:?package required}"

echo "::group::Setup"
mkdir -p dist
chmod +x ./system-bridge-linux
chmod +x ./system-bridge-tui
chmod +x ./.scripts/linux/create-*.sh
echo "::endgroup::"

echo "::group::List files"
ls -la
echo "::endgroup::"

echo "::group::List scripts"
ls -la ./.scripts/linux/
echo "::endgroup::"

echo "::group::Create ${package} package"
"./.scripts/linux/create-${package}.sh"
echo "::endgroup::"

echo "::group::List dist"
ls -la dist
echo "::endgroup::"
