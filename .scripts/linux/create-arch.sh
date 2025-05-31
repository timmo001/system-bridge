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
cp ../../system-bridge-linux system-bridge
cp ../../.scripts/linux/system-bridge.desktop .
cp ../../LICENSE .
cp ../../.scripts/linux/PKGBUILD .

# Copy icons
cp ../../.resources/system-bridge-circle.svg .
cp ../../.resources/system-bridge-circle-16x16.png .
cp ../../.resources/system-bridge-circle-32x32.png .
cp ../../.resources/system-bridge-circle.png .

# Sanitize VERSION for Arch pkgver
ARCH_PKGVER=$(echo "$VERSION" | sed 's/[-+]/./g')
export ARCH_PKGVER

echo "ARCH_PKGVER: $ARCH_PKGVER"

# Generate new sha256sums and update PKGBUILD
makepkg -g | grep sha256sums -A 7 >new_sums.txt
sed -i '/^sha256sums=(/,/^)/d' PKGBUILD
sed -i '/^source=/r new_sums.txt' PKGBUILD
rm new_sums.txt

# Build package
makepkg -f

# Move package to dist directory
mkdir -p ../../dist
mv *.pkg.tar.zst ../../dist/

cd ../..
rm -rf build/arch
