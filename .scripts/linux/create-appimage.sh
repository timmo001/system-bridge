#!/bin/bash

set -e

# Check if binary exists
if [ ! -f "system-bridge-linux" ]; then
  echo "system-bridge-linux not found, please build the application first"
  exit 1
fi

# Setup directories
mkdir -p AppDir/usr/bin
cp system-bridge-linux AppDir/usr/bin/system-bridge

# Create AppRun script
cat >AppDir/AppRun <<EOF
#!/bin/sh
exec \$APPDIR/usr/bin/system-bridge "\$@"
EOF
chmod +x AppDir/AppRun

# Copy the desktop file
cp "$(dirname "$0")/system-bridge.desktop" AppDir/

# Copy icons to AppDir
cp .resources/system-bridge-dimmed-512.png AppDir/system-bridge.png

# Copy icons
mkdir -p AppDir/usr/share/icons/hicolor/scalable/apps/
mkdir -p AppDir/usr/share/icons/hicolor/16x16/apps/
mkdir -p AppDir/usr/share/icons/hicolor/32x32/apps/
mkdir -p AppDir/usr/share/icons/hicolor/48x48/apps/
mkdir -p AppDir/usr/share/icons/hicolor/128x128/apps/
mkdir -p AppDir/usr/share/icons/hicolor/256x256/apps/
mkdir -p AppDir/usr/share/icons/hicolor/512x512/apps/
cp .resources/system-bridge-dimmed.svg AppDir/usr/share/icons/hicolor/scalable/apps/system-bridge.svg
cp .resources/system-bridge-dimmed-16.png AppDir/usr/share/icons/hicolor/16x16/apps/system-bridge.png
cp .resources/system-bridge-dimmed-32.png AppDir/usr/share/icons/hicolor/32x32/apps/system-bridge.png
cp .resources/system-bridge-dimmed-48.png AppDir/usr/share/icons/hicolor/48x48/apps/system-bridge.png
cp .resources/system-bridge-dimmed-128.png AppDir/usr/share/icons/hicolor/128x128/apps/system-bridge.png
cp .resources/system-bridge-dimmed-256.png AppDir/usr/share/icons/hicolor/256x256/apps/system-bridge.png
cp .resources/system-bridge-dimmed-512.png AppDir/usr/share/icons/hicolor/512x512/apps/system-bridge.png

# Build the AppImage
VERSION=${VERSION:-5.0.0} ./appimagetool AppDir dist/system-bridge-${VERSION}-x86_64.AppImage
