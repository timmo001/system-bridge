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
cp .resources/system-bridge-circle-16x16.png deb-structure/usr/share/icons/hicolor/16x16/apps/system-bridge.png
cp .resources/system-bridge-circle-32x32.png deb-structure/usr/share/icons/hicolor/32x32/apps/system-bridge.png
cp .resources/system-bridge-circle.png deb-structure/usr/share/icons/hicolor/128x128/apps/system-bridge.png
cp .resources/system-bridge-circle.svg deb-structure/usr/share/icons/hicolor/scalable/apps/system-bridge.svg

# Create control file from template
sed "s/\$VERSION/$VERSION/g" "$(dirname "$0")/control.template" >deb-structure/DEBIAN/control

# Build the DEB package
dpkg-deb --build deb-structure dist/system-bridge_${VERSION}_amd64.deb
