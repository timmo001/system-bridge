#!/usr/bin/env bash
# Run the AUR update, selecting the stable package for tags and the -git
# package otherwise. When running as root with a builduser available (the arch
# CI image), re-exec the underlying script as that unprivileged user, which
# makepkg requires.
#
# Reads AUR_SSH_PRIVATE_KEY, GITHUB_SHA, GITHUB_WORKSPACE and VERSION from the
# environment.
#
# Usage: update-aur-runner.sh <ref_type>
set -euo pipefail

ref_type="${1:?ref_type required}"

echo "::group::Setup"
if [[ "${ref_type}" == "tag" ]]; then
  GIT_BUILD="0"
else
  GIT_BUILD="1"
fi
export GIT_BUILD
chmod +x .scripts/linux/update-aur.sh

if [ "$(id -u)" -eq 0 ] && id -u builduser >/dev/null 2>&1; then
  echo "Switching to builduser..."
  chown -R builduser:builduser "$(pwd)"
  exec sudo --preserve-env=VERSION,AUR_SSH_PRIVATE_KEY,GITHUB_SHA,GITHUB_WORKSPACE,GIT_BUILD -u builduser -H bash ./.scripts/linux/update-aur.sh
fi
echo "::endgroup::"

echo "::group::Update AUR package"
./.scripts/linux/update-aur.sh
echo "::endgroup::"
