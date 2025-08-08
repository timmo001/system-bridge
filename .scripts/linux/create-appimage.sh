#!/bin/bash

set -euo pipefail

# Check if binary exists
if [ ! -f "system-bridge-linux" ]; then
  echo "system-bridge-linux not found, please build the application first"
  exit 1
fi

# Ensure appimagetool is available; try to install using detected package manager
APPIMAGETOOL_BIN="appimagetool"
if ! command -v appimagetool >/dev/null 2>&1; then
  echo "appimagetool not found, attempting installation..."
  if command -v pacman >/dev/null 2>&1; then
    # Arch Linux: try official repo first
    if sudo pacman -Si appimagetool >/dev/null 2>&1; then
      sudo pacman -S --noconfirm --needed appimagetool || true
    fi
  elif command -v apt-get >/dev/null 2>&1; then
    # Debian/Ubuntu
    sudo apt-get update -y || true
    sudo apt-get install -y appimagetool || true
  fi
  # Fallback: download continuous AppImage locally if still not available
  if ! command -v appimagetool >/dev/null 2>&1; then
    echo "Falling back to downloading appimagetool AppImage (continuous) locally..."
    ARCH=$(uname -m)
    case "$ARCH" in
      x86_64|amd64)
        APPIMAGE_URL="https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage"
        ;;
      aarch64|arm64)
        APPIMAGE_URL="https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-aarch64.AppImage"
        ;;
      armv7l|armv7)
        APPIMAGE_URL="https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-armhf.AppImage"
        ;;
      *)
        echo "Unsupported architecture for automatic download: $ARCH" >&2
        exit 1
        ;;
    esac
    curl -fsSL "$APPIMAGE_URL" -o ./appimagetool
    chmod +x ./appimagetool
    APPIMAGETOOL_BIN="./appimagetool"
  fi
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
mkdir -p dist
VERSION=${VERSION:-5.0.0} "$APPIMAGETOOL_BIN" AppDir dist/system-bridge-${VERSION}-x86_64.AppImage
