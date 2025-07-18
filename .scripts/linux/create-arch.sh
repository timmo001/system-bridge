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
cp ../../.resources/system-bridge-dimmed.svg system-bridge.svg
cp ../../.resources/system-bridge-dimmed-16.png system-bridge-16.png
cp ../../.resources/system-bridge-dimmed-32.png system-bridge-32.png
cp ../../.resources/system-bridge-dimmed-48.png system-bridge-48.png
cp ../../.resources/system-bridge-dimmed-128.png system-bridge-128.png
cp ../../.resources/system-bridge-dimmed-256.png system-bridge-256.png
cp ../../.resources/system-bridge-dimmed-512.png system-bridge-512.png

# Sanitize VERSION for Arch pkgver
ARCH_PKGVER=$(echo "$VERSION" | sed 's/[-+]/./g')
export ARCH_PKGVER

echo "ARCH_PKGVER: $ARCH_PKGVER"

# Generate new sha256sums and update PKGBUILD
makepkg -g >new_sums.txt
# Remove the old sha256sums array
sed -i '/^sha256sums=(/,/^)/d' PKGBUILD
# Insert the new sha256sums array after the source= line
awk '
  /source=/ { print; while ((getline line < "new_sums.txt") > 0) print line; next }
  { print }
' PKGBUILD >PKGBUILD.new && mv PKGBUILD.new PKGBUILD
rm new_sums.txt

# Build package
makepkg -f

# Move package to dist directory
mkdir -p ../../dist
mv *.pkg.tar.zst ../../dist/

cd ../..
rm -rf build/arch

# Write the main install file to a text file
echo "
# Install the package
yay -U dist/system-bridge-${ARCH_PKGVER}-1-x86_64.pkg.tar.zst
"
