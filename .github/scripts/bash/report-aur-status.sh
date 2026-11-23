#!/usr/bin/env bash
# Print the outcome of a shared AUR publication call.
#
# Usage: report-aur-status.sh <package_name> <job_result> <changed>
set -euo pipefail

package_name="${1:?package_name required}"
job_result="${2:?job_result required}"
changed="${3:-}"
package_url="https://aur.archlinux.org/packages/${package_name}"

if [[ "$job_result" == "success" ]]; then
  if [[ "$changed" == "true" ]]; then
    echo "AUR package updated successfully."
  elif [[ "$changed" == "false" ]]; then
    echo "AUR package is already current."
  else
    # The publish job never ran, so nothing reached the AUR
    echo "::error::AUR publication succeeded without reporting a change. Check the publish job ran."
    echo "Package: ${package_url}"
    exit 1
  fi
elif [[ "$job_result" == "skipped" ]]; then
  echo "AUR publication was skipped."
else
  echo "AUR publication ${job_result}. Check the publisher logs for details."
fi

echo "Package: ${package_url}"
