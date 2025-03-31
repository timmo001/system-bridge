#!/bin/bash

set -e

# Check if binary exists
if [ ! -f "system-bridge-linux" ]; then
  echo "system-bridge-linux not found, please build the application first"
  exit 1
fi

VERSION=${VERSION:-5.0.0}

# Convert version for RPM compatibility
if [[ $VERSION == *"-dev+"* ]]; then
  RPM_VERSION="5.0.0"
  # Extract the commit hash and use it in the release
  COMMIT_HASH=${VERSION#*+}
  RPM_RELEASE="0.dev.${COMMIT_HASH}"
else
  RPM_VERSION=$VERSION
  RPM_RELEASE="1"
fi

# Create directory structure in rpm-structure
mkdir -p rpm-structure/usr/bin
mkdir -p rpm-structure/usr/share/icons/hicolor/512x512/apps

# Copy files to rpm-structure
cp system-bridge-linux rpm-structure/usr/bin/system-bridge
cp .resources/system-bridge-circle.png rpm-structure/usr/share/icons/hicolor/512x512/apps/system-bridge.png

# Create the spec file directory
mkdir -p rpmbuild/SPECS

# Copy the spec file (with substitutions if needed)
sed -e "s/%{_version}/$RPM_VERSION/g" \
  -e "s/%{_release}/$RPM_RELEASE/g" \
  "$(dirname "$0")/system-bridge.spec" >rpmbuild/SPECS/system-bridge.spec

# Create BUILDROOT directory structure
BUILDROOT_DIR="rpmbuild/BUILDROOT/system-bridge-${RPM_VERSION}-${RPM_RELEASE}.x86_64"
mkdir -p "${BUILDROOT_DIR}/usr/bin"
mkdir -p "${BUILDROOT_DIR}/usr/share/icons/hicolor/512x512/apps"

# Copy files to BUILDROOT
cp rpm-structure/usr/bin/system-bridge "${BUILDROOT_DIR}/usr/bin/"
cp rpm-structure/usr/share/icons/hicolor/512x512/apps/system-bridge.png "${BUILDROOT_DIR}/usr/share/icons/hicolor/512x512/apps/"

# Build the RPM package
rpmbuild --define "_topdir $(pwd)/rpmbuild" \
  --define "_version ${RPM_VERSION}" \
  --define "_release ${RPM_RELEASE}" \
  --define "_builddir $(pwd)/rpm-structure" \
  --define "_rpmdir $(pwd)/dist" \
  -bb rpmbuild/SPECS/system-bridge.spec
