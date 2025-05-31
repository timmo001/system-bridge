#!/bin/bash

set -e

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
  sudo apt-get update
  sudo apt-get install -y flatpak flatpak-builder
fi

sudo flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
sudo flatpak install -y flathub org.freedesktop.Sdk//23.08
sudo flatpak install -y flathub org.freedesktop.Platform//23.08

# Create build directory
BUILD_DIR="flatpak-build"
mkdir -p "$BUILD_DIR"

# Build flatpak package
flatpak-builder --force-clean "$BUILD_DIR" "$(dirname "$0")/dev.timmo.system-bridge.yml"

# Create repo
mkdir -p repo
flatpak-builder --repo=repo --force-clean "$BUILD_DIR" "$(dirname "$0")/dev.timmo.system-bridge.yml"

# Create the Flatpak bundle
VERSION=${VERSION:-5.0.0}
mkdir -p dist
flatpak build-bundle repo "dist/system-bridge-${VERSION}.flatpak" dev.timmo.system-bridge

# Clean up
rm -f "$(dirname "$0")/dev.timmo.system-bridge.yml"
