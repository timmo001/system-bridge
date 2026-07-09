# Create the dummy binaries and directories the NSIS installer expects so its
# script can be compiled for validation without a real build.
#
# Usage: create-nsis-dummy-files.ps1
$ErrorActionPreference = 'Stop'

# Create dist directory for the now-playing helper
New-Item -ItemType Directory -Path ".scripts/windows/now-playing" -Force

# Create an empty file to serve as the dummy executable for the now-playing helper
New-Item -ItemType File -Path ".scripts/windows/now-playing/NowPlaying.exe" -Force

# Create dist directory for NSIS output
New-Item -ItemType Directory -Path "dist" -Force

# Create an empty file to serve as the dummy executable for the main application
New-Item -ItemType File -Path "dist/system-bridge.exe" -Force

# Create an empty file to serve as the dummy executable for the TUI
New-Item -ItemType File -Path "dist/system-bridge-tui.exe" -Force
