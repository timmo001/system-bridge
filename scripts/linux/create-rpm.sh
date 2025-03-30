#!/bin/bash

set -e

VERSION=${VERSION:-0.0.0}

# Create directory structure
mkdir -p rpm-structure/usr/bin
cp system-bridge rpm-structure/usr/bin/system-bridge

# Create the spec file directory
mkdir -p rpmbuild/SPECS

# Copy the spec file (with substitutions if needed)
sed "s/%{_version}/$VERSION/g" "$(dirname "$0")/system-bridge.spec" >rpmbuild/SPECS/system-bridge.spec

# Build the RPM package
rpmbuild --define "_topdir $(pwd)/rpmbuild" \
  --define "_version ${VERSION}" \
  --define "_builddir $(pwd)/rpm-structure" \
  --define "_rpmdir $(pwd)/dist" \
  -bb rpmbuild/SPECS/system-bridge.spec
