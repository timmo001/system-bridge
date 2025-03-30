#!/bin/bash

set -e

VERSION=${VERSION:-0.0.0}

# Create directory structure
mkdir -p deb-structure/DEBIAN
mkdir -p deb-structure/usr/bin

# Copy binary
cp system-bridge-linux deb-structure/usr/bin/system-bridge

# Create control file from template
sed "s/\$VERSION/$VERSION/g" "$(dirname "$0")/control.template" >deb-structure/DEBIAN/control

# Build the DEB package
dpkg-deb --build deb-structure dist/system-bridge_${VERSION}_amd64.deb
