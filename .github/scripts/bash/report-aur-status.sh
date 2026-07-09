#!/usr/bin/env bash
# Print the outcome of the AUR update job and, on success, the package URL.
#
# Usage: report-aur-status.sh <job_status> <ref_type>
set -euo pipefail

job_status="${1:?job_status required}"
ref_type="${2:-}"

if [ "${job_status}" == 'success' ]; then
  echo "✅ AUR package updated successfully!"
  if [[ "${ref_type}" == "tag" ]]; then
    echo "Package: https://aur.archlinux.org/packages/system-bridge"
  else
    echo "Package: https://aur.archlinux.org/packages/system-bridge-git"
  fi
else
  echo "❌ Failed to update AUR package"
  echo "Check the logs above for details"
fi
