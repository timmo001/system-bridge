#!/usr/bin/env bash
# Decide whether a dev push touches anything that warrants refreshing the AUR
# package, and expose the result as the step output "changed".
#
# Fall back to updating the AUR package whenever we cannot reliably diff (first
# push, force-push/rewritten history, or the "before" object is missing from
# the checkout). Better to publish than to silently skip a real change or crash
# the whole job.
#
# Usage: detect-aur-changes.sh <before_sha> <after_sha>
set -euo pipefail

before="${1:-}"
after="${2:-}"

if [ -z "${before}" ] || [ "${before}" = "0000000000000000000000000000000000000000" ] \
  || ! git cat-file -e "${before}^{commit}" 2>/dev/null \
  || ! git cat-file -e "${after}^{commit}" 2>/dev/null; then
  echo "Diff base unavailable (${before}..${after}); assuming AUR-relevant changes."
  echo "changed=true" >>"${GITHUB_OUTPUT}"
  exit 0
fi

changed_files="$(git diff --name-only "${before}" "${after}")"
if printf '%s\n' "${changed_files}" | grep -Eq '(^|/)[^/]+\.go$|^(web-client/src/|tui/src/|\.github/workflows/|\.github/actions/|\.scripts/)'; then
  echo "changed=true" >>"${GITHUB_OUTPUT}"
else
  echo "changed=false" >>"${GITHUB_OUTPUT}"
fi
