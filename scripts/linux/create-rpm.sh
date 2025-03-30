#!/bin/bash

set -e

VERSION=${VERSION:-0.0.0}

# Convert version for RPM compatibility
if [[ $VERSION == *"-dev+"* ]]; then
    RPM_VERSION="0.0.0"
    # Extract the commit hash and use it in the release
    COMMIT_HASH=${VERSION#*+}
    RPM_RELEASE="0.dev.${COMMIT_HASH}"
else
    RPM_VERSION=$VERSION
    RPM_RELEASE="1"
fi

# Create directory structure
mkdir -p rpm-structure/usr/bin
mkdir -p rpm-structure/usr/share/icons/hicolor/512x512/apps
cp system-bridge-linux rpm-structure/usr/bin/system-bridge
cp resources/system-bridge-circle.png rpm-structure/usr/share/icons/hicolor/512x512/apps/system-bridge.png

# Create the spec file directory
mkdir -p rpmbuild/SPECS

# Copy the spec file (with substitutions if needed)
sed -e "s/%{_version}/$RPM_VERSION/g" \
    -e "s/%{_release}/$RPM_RELEASE/g" \
    "$(dirname "$0")/system-bridge.spec" >rpmbuild/SPECS/system-bridge.spec

# Create BUILDROOT directory and copy files
mkdir -p "rpmbuild/BUILDROOT/system-bridge-${RPM_VERSION}-${RPM_RELEASE}.x86_64/usr/bin"
mkdir -p "rpmbuild/BUILDROOT/system-bridge-${RPM_VERSION}-${RPM_RELEASE}.x86_64/usr/share/icons/hicolor/512x512/apps"

# Copy files to BUILDROOT
cp rpm-structure/usr/bin/system-bridge "rpmbuild/BUILDROOT/system-bridge-${RPM_VERSION}-${RPM_RELEASE}.x86_64/usr/bin/"
cp rpm-structure/usr/share/icons/hicolor/512x512/apps/system-bridge.png "rpmbuild/BUILDROOT/system-bridge-${RPM_VERSION}-${RPM_RELEASE}.x86_64/usr/share/icons/hicolor/512x512/apps/"

# Build the RPM package
rpmbuild --define "_topdir $(pwd)/rpmbuild" \
  --define "_version ${RPM_VERSION}" \
  --define "_release ${RPM_RELEASE}" \
  --define "_builddir $(pwd)/rpm-structure" \
  --define "_rpmdir $(pwd)/dist" \
  -bb rpmbuild/SPECS/system-bridge.spec
