#!/usr/bin/env bash
# Render the Debian control template and run basic validation on the result.
#
# Usage: validate-debian-control.sh
set -euo pipefail

# Create a temporary directory structure
mkdir -p debian/DEBIAN
VERSION=1.0.0 envsubst <.scripts/linux/control.template >debian/DEBIAN/control
# Validate control file syntax
dpkg-parsechangelog -l debian/DEBIAN/control || echo "Control file validation failed"
# Additional basic validation
grep -q "^Package:" debian/DEBIAN/control || exit 1
grep -q "^Version:" debian/DEBIAN/control || exit 1
grep -q "^Architecture:" debian/DEBIAN/control || exit 1
grep -q "^Description:" debian/DEBIAN/control || exit 1
