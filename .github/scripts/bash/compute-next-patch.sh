#!/usr/bin/env bash
# Compute the next patch tag from the just-published release tag and expose it
# as the step output "next_tag". A stable X.Y.Z bumps the patch; an X.Y.Z-beta.N
# prerelease drops to the stable X.Y.Z.
#
# Usage: compute-next-patch.sh <previous_tag>
set -euo pipefail

PREV_TAG="${1:-}"
if [[ -z "${PREV_TAG}" ]]; then
  echo "Release tag not available in context." >&2
  exit 1
fi
echo "Previous tag: ${PREV_TAG}"
NEXT_TAG=""
if [[ "${PREV_TAG}" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)-beta\.([0-9]+)$ ]]; then
  MAJOR="${BASH_REMATCH[1]}"
  MINOR="${BASH_REMATCH[2]}"
  PATCH="${BASH_REMATCH[3]}"
  NEXT_TAG="${MAJOR}.${MINOR}.${PATCH}"
elif [[ "${PREV_TAG}" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
  MAJOR="${BASH_REMATCH[1]}"
  MINOR="${BASH_REMATCH[2]}"
  PATCH="${BASH_REMATCH[3]}"
  NEXT_PATCH=$((PATCH + 1))
  NEXT_TAG="${MAJOR}.${MINOR}.${NEXT_PATCH}"
else
  # Fallback: strip common prerelease suffix and try to bump patch
  CLEAN_TAG="${PREV_TAG%%-*}"
  if [[ "${CLEAN_TAG}" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
    MAJOR="${BASH_REMATCH[1]}"
    MINOR="${BASH_REMATCH[2]}"
    PATCH="${BASH_REMATCH[3]}"
    NEXT_TAG="${MAJOR}.${MINOR}.$((PATCH + 1))"
  else
    NEXT_TAG="${PREV_TAG}"
  fi
fi
echo "Next patch tag: ${NEXT_TAG}"
echo "next_tag=${NEXT_TAG}" >>"${GITHUB_OUTPUT}"
