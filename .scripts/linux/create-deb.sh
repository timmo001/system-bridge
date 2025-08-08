#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

# Ensure output directory exists
mkdir -p dist

# Ensure required tools are installed (dpkg-deb)
if ! command -v dpkg-deb >/dev/null 2>&1; then
  echo "dpkg-deb not found, attempting installation..."
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -y
    sudo apt-get install -y dpkg-dev dpkg
  elif command -v pacman >/dev/null 2>&1; then
    sudo pacman -Syu --noconfirm --needed dpkg
  else
    echo "Unsupported or unknown package manager. Please install 'dpkg-deb' (dpkg) and retry." >&2
    exit 1
  fi
fi

# Clean previous packaging dir if present
rm -rf deb-structure

# Check if binary exists
if [ ! -f "system-bridge-linux" ]; then
  echo "system-bridge-linux not found, please build the application first (e.g. 'make build')" >&2
  exit 1
fi

# Determine version
VERSION=${VERSION:-5.0.0}

# Determine Debian architecture
if command -v dpkg >/dev/null 2>&1; then
  ARCH=$(dpkg --print-architecture)
else
  UNAME_ARCH=$(uname -m)
  case "$UNAME_ARCH" in
    x86_64) ARCH=amd64 ;;
    aarch64|arm64) ARCH=arm64 ;;
    armv7l|armv7) ARCH=armhf ;;
    armv6l) ARCH=armel ;;
    *) ARCH="$UNAME_ARCH" ;;
  esac
fi

# Create directory structure with correct permissions
mkdir -p deb-structure/DEBIAN

# Install binary
install -Dm755 system-bridge-linux deb-structure/usr/bin/system-bridge

# Install desktop file
install -Dm644 "$SCRIPT_DIR/system-bridge.desktop" \
  deb-structure/usr/share/applications/system-bridge.desktop

# Install icons
install -Dm644 .resources/system-bridge-dimmed.svg \
  deb-structure/usr/share/icons/hicolor/scalable/apps/system-bridge.svg
install -Dm644 .resources/system-bridge-dimmed-16.png \
  deb-structure/usr/share/icons/hicolor/16x16/apps/system-bridge.png
install -Dm644 .resources/system-bridge-dimmed-32.png \
  deb-structure/usr/share/icons/hicolor/32x32/apps/system-bridge.png
install -Dm644 .resources/system-bridge-dimmed-48.png \
  deb-structure/usr/share/icons/hicolor/48x48/apps/system-bridge.png
install -Dm644 .resources/system-bridge-dimmed-128.png \
  deb-structure/usr/share/icons/hicolor/128x128/apps/system-bridge.png
install -Dm644 .resources/system-bridge-dimmed-256.png \
  deb-structure/usr/share/icons/hicolor/256x256/apps/system-bridge.png
install -Dm644 .resources/system-bridge-dimmed-512.png \
  deb-structure/usr/share/icons/hicolor/512x512/apps/system-bridge.png

# Create control file from template (substitute version and arch)
sed -e 's/\$VERSION/'"$VERSION"'/g' \
    -e 's/\$ARCH/'"$ARCH"'/g' \
    "$SCRIPT_DIR/control.template" > deb-structure/DEBIAN/control

# Build the DEB package (ensure root ownership in archive)
dpkg-deb --build --root-owner-group deb-structure "dist/system-bridge_${VERSION}_${ARCH}.deb"

echo "Built DEB: dist/system-bridge_${VERSION}_${ARCH}.deb"
