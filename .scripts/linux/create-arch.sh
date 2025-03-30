#!/bin/bash

set -e

# Check if binary exists
if [ ! -f "system-bridge-linux" ]; then
  echo "system-bridge-linux not found, please build the application first"
  exit 1
fi

# Create build directory
mkdir -p build/arch
cd build/arch

# Copy necessary files
cp ../../system-bridge-linux .
cp ../../.scripts/linux/system-bridge.desktop .
cp ../../LICENSE .
cp ../../.scripts/linux/PKGBUILD .

# Copy icons
cp ../../.resources/system-bridge-circle.svg .
cp ../../.resources/system-bridge-circle-16x16.png .
cp ../../.resources/system-bridge-circle-32x32.png .
cp ../../.resources/system-bridge-circle.png .

# Build package
makepkg -f

# Move package to dist directory
mkdir -p ../../dist
mv *.pkg.tar.zst ../../dist/

cd ../..
rm -rf build/arch
