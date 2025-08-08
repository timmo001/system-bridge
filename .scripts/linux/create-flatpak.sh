#!/bin/bash

set -euo pipefail

# Check if binary exists
if [ ! -f "system-bridge-linux" ]; then
  echo "system-bridge-linux not found, please build the application first"
  exit 1
fi

# Check if all icon files exist
for icon in .resources/system-bridge-dimmed.svg \
  .resources/system-bridge-dimmed-16.png \
  .resources/system-bridge-dimmed-32.png \
  .resources/system-bridge-dimmed-48.png \
  .resources/system-bridge-dimmed-128.png \
  .resources/system-bridge-dimmed-256.png \
  .resources/system-bridge-dimmed-512.png; do
  if [ ! -f "$icon" ]; then
    echo "$icon not found, please add all required icon files"
    exit 1
  fi
done

# Required tools check
if ! command -v flatpak-builder &>/dev/null; then
  echo "flatpak-builder not found, installing..."
  if command -v apt-get &>/dev/null; then
    sudo apt-get update -y
    sudo apt-get install -y flatpak flatpak-builder
  elif command -v pacman &>/dev/null; then
    sudo pacman -Syu --noconfirm --needed flatpak flatpak-builder
  else
    echo "Package manager not found for installing flatpak-builder" >&2
    exit 1
  fi
fi

flatpak remote-add --if-not-exists --user flathub https://flathub.org/repo/flathub.flatpakrepo || true
flatpak install -y --user flathub org.freedesktop.Sdk//23.08
flatpak install -y --user flathub org.freedesktop.Platform//23.08

# Create build directory
BUILD_DIR="flatpak-build"
mkdir -p "$BUILD_DIR"

# Build flatpak package (disable rofiles fuse for containerized CI)
flatpak-builder --force-clean --disable-rofiles-fuse "$BUILD_DIR" "$(dirname "$0")/dev.timmo.system-bridge.yml"

# Create and configure repo (avoid min-free-space errors in constrained envs)
mkdir -p repo
# Prefer ostree for fine-grained config when available; otherwise fall back to flatpak
if command -v ostree &>/dev/null; then
  ostree --repo=repo init --mode=archive || true
  ostree --repo=repo config set core.min-free-space-percent 0 || true
  ostree --repo=repo config set core.min-free-space-size 0 || true
else
  # This may fail on a fresh repo; ignore and continue, export will create it
  flatpak build-update-repo --min-free-space-size=0 --min-free-space-percent=0 repo || true
fi
flatpak-builder --repo=repo --force-clean --disable-rofiles-fuse "$BUILD_DIR" "$(dirname "$0")/dev.timmo.system-bridge.yml"

# Create the Flatpak bundle
VERSION=${VERSION:-5.0.0}
mkdir -p dist
flatpak build-bundle repo "dist/system-bridge-${VERSION}.flatpak" dev.timmo.system-bridge

# Do not remove manifest; keep repository clean for subsequent runs
