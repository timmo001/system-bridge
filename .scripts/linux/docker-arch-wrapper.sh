#!/bin/bash

set -e

echo "Starting Arch package creation inside container..."
echo "Container VERSION: $VERSION"

# Install required packages
pacman -Syu --noconfirm
pacman -S --noconfirm base-devel sudo

# Create builduser
useradd -m builduser
echo 'builduser ALL=(ALL) NOPASSWD: ALL' > /etc/sudoers.d/builduser

# Copy build files
mkdir -p /home/builduser/build
cp -r /build/* /home/builduser/build/
chown -R builduser:builduser /home/builduser/build

# Save VERSION for builduser
echo "$VERSION" > /home/builduser/build/VERSION_FILE
chown builduser:builduser /home/builduser/build/VERSION_FILE

# Switch to build directory
cd /home/builduser/build/.scripts/linux

echo "Running create-arch.sh with VERSION: $VERSION"

# Run the arch creation script as builduser
su builduser -c '
    export VERSION=$(cat ../../VERSION_FILE)
    echo "builduser VERSION: $VERSION"
    ./create-arch.sh
'

echo "Arch package creation completed"
ls -la /home/builduser/build/dist/ || echo "No dist directory found"
find /home/builduser/build -name "*.pkg.tar.zst" -type f -exec ls -la {} \; -exec cp {} /build/dist/ \; || echo "No .pkg.tar.zst files found"
echo "Docker container work completed"