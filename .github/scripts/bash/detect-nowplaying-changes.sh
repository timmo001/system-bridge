#!/usr/bin/env bash
# Decide whether a pull request touches anything that affects the Windows
# NowPlaying helper, and expose the result as the step output "changed".
#
# Usage: detect-nowplaying-changes.sh <base_sha> <head_sha>
set -euo pipefail

base_sha="${1:?base_sha required}"
head_sha="${2:?head_sha required}"

changed_files="$(git diff --name-only "${base_sha}" "${head_sha}")"

if printf '%s\n' "${changed_files}" | grep -Eq '^(\.github/workflows/build-and-package-application\.yml|data/module/media/media_windows\.go|\.scripts/windows/(create-installer\.ps1|download-now-playing\.ps1|installer\.nsi\.template))$'; then
  echo "changed=true" >>"${GITHUB_OUTPUT}"
else
  echo "changed=false" >>"${GITHUB_OUTPUT}"
fi
