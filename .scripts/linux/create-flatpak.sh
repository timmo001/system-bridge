#!/bin/bash

set -e

# Required tools check
if ! command -v flatpak-builder &> /dev/null; then
    echo "flatpak-builder not found, installing..."
    sudo apt-get update
    sudo apt-get install -y flatpak flatpak-builder
fi

# Setup flatpak repository if needed
flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo

# Create build directory
BUILD_DIR="flatpak-build"
mkdir -p "$BUILD_DIR"

# Create flatpak manifest
cat > "$(dirname "$0")/dev.timmo.system-bridge.yml" << EOF
app-id: dev.timmo.system-bridge
runtime: org.freedesktop.Platform
runtime-version: '23.08'
sdk: org.freedesktop.Sdk
command: system-bridge
finish-args:
  - --share=network
  - --share=ipc
  - --socket=x11
  - --socket=wayland
  - --device=dri
  - --filesystem=host
  - --talk-name=org.freedesktop.Notifications
modules:
  - name: system-bridge
    buildsystem: simple
    build-commands:
      - install -Dm755 system-bridge-linux /app/bin/system-bridge
      - mkdir -p /app/share/applications
      - cp .scripts/linux/system-bridge.desktop /app/share/applications/dev.timmo.system-bridge.desktop
      - sed -i 's|Exec=system-bridge|Exec=system-bridge|g' /app/share/applications/dev.timmo.system-bridge.desktop
      - sed -i 's|Icon=system-bridge|Icon=dev.timmo.system-bridge|g' /app/share/applications/dev.timmo.system-bridge.desktop
      - mkdir -p /app/share/icons/hicolor/512x512/apps
      - cp .resources/system-bridge-circle.png /app/share/icons/hicolor/512x512/apps/dev.timmo.system-bridge.png
    sources:
      - type: file
        path: system-bridge-linux
      - type: file
        path: .scripts/linux/system-bridge.desktop
      - type: file
        path: .resources/system-bridge-circle.png
EOF

# Build flatpak package
flatpak-builder --force-clean "$BUILD_DIR" "$(dirname "$0")/dev.timmo.system-bridge.yml"

# Create repo
mkdir -p repo
flatpak-builder --repo=repo --force-clean "$BUILD_DIR" "$(dirname "$0")/dev.timmo.system-bridge.yml"

# Create the Flatpak bundle
VERSION=${VERSION:-0.0.0}
mkdir -p dist
flatpak build-bundle repo "dist/system-bridge-${VERSION}.flatpak" dev.timmo.system-bridge

# Clean up
rm -f "$(dirname "$0")/dev.timmo.system-bridge.yml"
