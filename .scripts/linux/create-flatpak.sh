#!/bin/bash

set -e

# Check if binary exists
if [ ! -f "system-bridge-linux" ]; then
  echo "system-bridge-linux not found, please build the application first"
  exit 1
fi

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
