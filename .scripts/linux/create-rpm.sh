#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

# Ensure output dir exists
mkdir -p dist

# Auto-install rpm tooling on Arch/Debian-based systems if missing (local dev convenience)
if ! command -v rpmbuild >/dev/null 2>&1; then
  if command -v pacman >/dev/null 2>&1; then
    echo "rpmbuild not found. Installing rpm-tools via pacman..."
    sudo pacman -S --noconfirm rpm-tools
  elif command -v apt-get >/dev/null 2>&1; then
    echo "rpmbuild not found. Installing rpm via apt-get..."
    sudo apt-get update -y && sudo apt-get install -y rpm
  else
    echo "rpmbuild not found and automatic installation not supported on this distro." >&2
    exit 1
  fi
fi

# Check if binary exists
if [ ! -f "system-bridge-linux" ]; then
  echo "system-bridge-linux not found, please build the application first (e.g. 'make build')" >&2
  exit 1
fi

VERSION=${VERSION:-5.0.0}

# Convert version for RPM compatibility
if [[ $VERSION == *"-dev+"* ]]; then
  RPM_VERSION="5.0.0"
  COMMIT_HASH=${VERSION#*+}
  RPM_RELEASE="0.dev.${COMMIT_HASH}"
else
  RPM_VERSION=$VERSION
  RPM_RELEASE="1"
fi

# Stage files into a temporary builddir that the spec will copy from
STAGING_DIR="rpm-structure"
rm -rf "$STAGING_DIR" rpmbuild
mkdir -p "$STAGING_DIR/usr/bin"
mkdir -p "$STAGING_DIR/usr/share/applications"
mkdir -p "$STAGING_DIR/usr/share/icons/hicolor/scalable/apps"
mkdir -p "$STAGING_DIR/usr/share/icons/hicolor/16x16/apps"
mkdir -p "$STAGING_DIR/usr/share/icons/hicolor/32x32/apps"
mkdir -p "$STAGING_DIR/usr/share/icons/hicolor/48x48/apps"
mkdir -p "$STAGING_DIR/usr/share/icons/hicolor/128x128/apps"
mkdir -p "$STAGING_DIR/usr/share/icons/hicolor/256x256/apps"
mkdir -p "$STAGING_DIR/usr/share/icons/hicolor/512x512/apps"

install -Dm755 system-bridge-linux "$STAGING_DIR/usr/bin/system-bridge"
install -Dm644 "$SCRIPT_DIR/system-bridge.desktop" "$STAGING_DIR/usr/share/applications/system-bridge.desktop"
install -Dm644 .resources/system-bridge-dimmed.svg "$STAGING_DIR/usr/share/icons/hicolor/scalable/apps/system-bridge.svg"
install -Dm644 .resources/system-bridge-dimmed-16.png "$STAGING_DIR/usr/share/icons/hicolor/16x16/apps/system-bridge.png"
install -Dm644 .resources/system-bridge-dimmed-32.png "$STAGING_DIR/usr/share/icons/hicolor/32x32/apps/system-bridge.png"
install -Dm644 .resources/system-bridge-dimmed-48.png "$STAGING_DIR/usr/share/icons/hicolor/48x48/apps/system-bridge.png"
install -Dm644 .resources/system-bridge-dimmed-128.png "$STAGING_DIR/usr/share/icons/hicolor/128x128/apps/system-bridge.png"
install -Dm644 .resources/system-bridge-dimmed-256.png "$STAGING_DIR/usr/share/icons/hicolor/256x256/apps/system-bridge.png"
install -Dm644 .resources/system-bridge-dimmed-512.png "$STAGING_DIR/usr/share/icons/hicolor/512x512/apps/system-bridge.png"

# Mirror staged content into the rpmbuild working subdirectory expected by rpmbuild
BUILD_SUBDIR_NAME="system-bridge-${RPM_VERSION}-build"
BUILD_SUBDIR_PATH="${STAGING_DIR}/${BUILD_SUBDIR_NAME}"
mkdir -p "${BUILD_SUBDIR_PATH}"
# Copy only the staged usr/ tree; rpmbuild will reference %{_builddir}/usr/...
cp -a "${STAGING_DIR}/usr" "${BUILD_SUBDIR_PATH}/" 2>/dev/null || true

# Prepare spec within rpmbuild tree
mkdir -p rpmbuild/SPECS
cp "$SCRIPT_DIR/system-bridge.spec" rpmbuild/SPECS/system-bridge.spec

# Build the RPM package
rpmbuild --define "_topdir $(pwd)/rpmbuild" \
  --define "_version ${RPM_VERSION}" \
  --define "_release ${RPM_RELEASE}" \
  --define "_builddir $(pwd)/${BUILD_SUBDIR_PATH}" \
  --define "_stagedir $(pwd)/${STAGING_DIR}/usr" \
  --define "_rpmdir $(pwd)/dist" \
  -bb rpmbuild/SPECS/system-bridge.spec

echo "Built RPM(s) to: dist/"
