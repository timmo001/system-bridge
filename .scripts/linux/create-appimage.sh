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

# Copy icon to AppDir
cp .resources/system-bridge-circle.png AppDir/system-bridge.png

# Copy icon to icons directory
mkdir -p AppDir/usr/share/icons/hicolor/512x512/apps/
cp .resources/system-bridge-circle.png AppDir/usr/share/icons/hicolor/512x512/apps/system-bridge.png

# Build the AppImage
VERSION=${VERSION:-5.0.0} ./appimagetool AppDir dist/system-bridge-${VERSION}-x86_64.AppImage
