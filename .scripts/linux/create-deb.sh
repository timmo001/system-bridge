#!/bin/bash

set -e

# Check if binary exists
if [ ! -f "system-bridge-linux" ]; then
  echo "system-bridge-linux not found, please build the application first"
  exit 1
fi

VERSION=${VERSION:-5.0.0}

# Create directory structure
mkdir -p deb-structure/DEBIAN
mkdir -p deb-structure/usr/bin
mkdir -p deb-structure/usr/share/icons/hicolor/16x16/apps
mkdir -p deb-structure/usr/share/icons/hicolor/32x32/apps
mkdir -p deb-structure/usr/share/icons/hicolor/48x48/apps
mkdir -p deb-structure/usr/share/icons/hicolor/128x128/apps
mkdir -p deb-structure/usr/share/icons/hicolor/scalable/apps

# Copy binary
cp system-bridge-linux deb-structure/usr/bin/system-bridge

# Copy icons
mkdir -p deb-structure/usr/share/icons/hicolor/scalable/apps
mkdir -p deb-structure/usr/share/icons/hicolor/16x16/apps
mkdir -p deb-structure/usr/share/icons/hicolor/32x32/apps
mkdir -p deb-structure/usr/share/icons/hicolor/48x48/apps
mkdir -p deb-structure/usr/share/icons/hicolor/128x128/apps
mkdir -p deb-structure/usr/share/icons/hicolor/256x256/apps
mkdir -p deb-structure/usr/share/icons/hicolor/512x512/apps

cp .resources/system-bridge-dimmed.svg deb-structure/usr/share/icons/hicolor/scalable/apps/system-bridge.svg
cp .resources/system-bridge-dimmed-16.png deb-structure/usr/share/icons/hicolor/16x16/apps/system-bridge.png
cp .resources/system-bridge-dimmed-32.png deb-structure/usr/share/icons/hicolor/32x32/apps/system-bridge.png
cp .resources/system-bridge-dimmed-48.png deb-structure/usr/share/icons/hicolor/48x48/apps/system-bridge.png
cp .resources/system-bridge-dimmed-128.png deb-structure/usr/share/icons/hicolor/128x128/apps/system-bridge.png
cp .resources/system-bridge-dimmed-256.png deb-structure/usr/share/icons/hicolor/256x256/apps/system-bridge.png
cp .resources/system-bridge-dimmed-512.png deb-structure/usr/share/icons/hicolor/512x512/apps/system-bridge.png

# Create control file from template
sed "s/\$VERSION/$VERSION/g" "$(dirname "$0")/control.template" >deb-structure/DEBIAN/control

# Build the DEB package
dpkg-deb --build deb-structure dist/system-bridge_${VERSION}_amd64.deb
