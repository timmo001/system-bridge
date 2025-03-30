#!/bin/bash

set -e

# Setup directories
mkdir -p AppDir/usr/bin
cp system-bridge AppDir/usr/bin/system-bridge

# Create AppRun script
cat >AppDir/AppRun <<EOF
#!/bin/sh
exec \$APPDIR/usr/bin/system-bridge "\$@"
EOF
chmod +x AppDir/AppRun

# Copy the desktop file
cp "$(dirname "$0")/system-bridge.desktop" AppDir/

# Create a simple icon
mkdir -p AppDir/usr/share/icons/hicolor/256x256/apps/
echo "P1 1 1 1" >AppDir/usr/share/icons/hicolor/256x256/apps/system-bridge.pbm

# Build the AppImage
VERSION=${VERSION:-0.0.0} ./appimagetool AppDir dist/system-bridge-${VERSION}-x86_64.AppImage
