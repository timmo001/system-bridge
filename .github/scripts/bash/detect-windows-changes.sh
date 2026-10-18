#!/usr/bin/env bash
# Decide whether a pull request touches anything that can affect the Windows
# build, and expose the result as the step output "changed".
#
# Files that can't affect it are listed below; anything else counts. Assume a
# change whenever the diff can't be worked out, so the build never skips by
# mistake.
#
# Usage: detect-windows-changes.sh <base_sha> <head_sha>
set -euo pipefail

base_sha="${1:-}"
head_sha="${2:-}"

if [ -z "${base_sha}" ] || [ -z "${head_sha}" ] \
  || ! git cat-file -e "${base_sha}^{commit}" 2>/dev/null \
  || ! git cat-file -e "${head_sha}^{commit}" 2>/dev/null \
  || ! changed_files="$(git diff --name-only "${base_sha}...${head_sha}")"; then
  echo "Diff base unavailable (${base_sha}...${head_sha}); assuming Windows-relevant changes."
  echo "changed=true" >>"${GITHUB_OUTPUT}"
  exit 0
fi

relevant=()
while IFS= read -r file; do
  [ -n "${file}" ] || continue
  case "${file}" in
    .github/workflows/build-and-package-application.yml) relevant+=("${file}") ;;
    *.md | *_test.go \
      | docs/* | connector/python/* | omarchy-plugin/* \
      | .agents/* | .claude/* | .vscode/* | .scripts/linux/* \
      | .github/workflows/* | .github/ISSUE_TEMPLATE/* \
      | .github/scripts/bash/package-linux.sh \
      | .github/scripts/bash/publish-omarchy-plugin*.sh \
      | .github/scripts/bash/report-aur-status.sh \
      | .github/scripts/bash/validate-debian-control.sh \
      | .github/scripts/bash/detect-aur-changes.sh \
      | Dockerfile.* | .actrc | .cursorignore | .golangci.yml \
      | .markdownlintignore | .yamllint.yml | opencode.json \
      | pitchfork.toml | renovate.json | skills-lock.json) ;;
    *) relevant+=("${file}") ;;
  esac
done <<<"${changed_files}"

if [ "${#relevant[@]}" -gt 0 ]; then
  echo "Windows-relevant changes:"
  printf '  %s\n' "${relevant[@]}"
  echo "changed=true" >>"${GITHUB_OUTPUT}"
else
  echo "No Windows-relevant changes; skipping the Windows build."
  echo "changed=false" >>"${GITHUB_OUTPUT}"
fi
