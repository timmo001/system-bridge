#!/usr/bin/env bash
# Resolve the build version and expose it as VERSION (job env) and the step
# output "version". Tagged builds use the tag name; everything else gets a
# dev version pinned to the commit SHA.
#
# Usage: get-version.sh <ref_type> <ref_name> <commit_sha>
set -euo pipefail

ref_type="${1:?ref_type required}"
ref_name="${2:?ref_name required}"
commit_sha="${3:?commit_sha required}"

if [[ "${ref_type}" == "tag" ]]; then
  VERSION="${ref_name}"
else
  VERSION="5.0.0-dev+${commit_sha}"
fi

echo "VERSION=${VERSION}" >>"${GITHUB_ENV}"
echo "version=${VERSION}" >>"${GITHUB_OUTPUT}"
