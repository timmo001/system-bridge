#!/bin/bash

set -e

# Configuration
AUR_PACKAGE_NAME="system-bridge-git"
AUR_REPO_URL="ssh://aur@aur.archlinux.org/${AUR_PACKAGE_NAME}.git"

# Check required environment variables
if [ -z "$AUR_SSH_PRIVATE_KEY" ]; then
    echo "Error: AUR_SSH_PRIVATE_KEY environment variable is required"
    exit 1
fi

# Setup SSH for AUR
mkdir -p ~/.ssh
echo "$AUR_SSH_PRIVATE_KEY" > ~/.ssh/aur_rsa
chmod 600 ~/.ssh/aur_rsa

# Add AUR to known hosts dynamically
echo "Adding AUR host key..."
if ssh-keyscan -H aur.archlinux.org >> ~/.ssh/known_hosts 2>/dev/null; then
    echo "Successfully added AUR host key"
    STRICT_HOST_CHECKING=""
else
    echo "Warning: Could not fetch AUR host key via ssh-keyscan, disabling host key verification"
    STRICT_HOST_CHECKING="StrictHostKeyChecking no"
fi

# Configure SSH to use the AUR key
cat << EOF > ~/.ssh/config
Host aur.archlinux.org
  IdentityFile ~/.ssh/aur_rsa
  User aur
  ${STRICT_HOST_CHECKING}
EOF

# Set up git config
git config --global user.name "System Bridge Bot"
git config --global user.email "github-actions@timmo001.com"

# Create temporary directory
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Clone AUR repository
echo "Cloning AUR repository..."
git clone "$AUR_REPO_URL" aur-repo
cd aur-repo

# Configure Git to allow operations on this repository
git config --global --add safe.directory "$(pwd)"

# Create a non-root user for makepkg
useradd -m builduser
# Ensure builduser can access the working directory and all parent directories
chmod 755 "$TEMP_DIR"
chown -R builduser:builduser .

# Copy the updated PKGBUILD and configure for AUR
echo "Updating PKGBUILD..."
cp "$GITHUB_WORKSPACE/.scripts/linux/PKGBUILD" PKGBUILD
cp "$GITHUB_WORKSPACE/VERSION" VERSION

# Create a build directory that builduser can access
export BUILDDIR="/tmp/makepkg-build"
mkdir -p "$BUILDDIR"
chown -R builduser:builduser "$BUILDDIR"

# Update .SRCINFO with AUR configuration as builduser
echo "Generating .SRCINFO..."
sudo -u builduser bash -c "export BUILDDIR='$BUILDDIR' && AUR_BUILD=1 makepkg --printsrcinfo > .SRCINFO"

# Check if there are changes - use a more robust method
echo "Checking for changes..."
if git status --porcelain | grep -q .; then
    echo "Changes detected, proceeding with commit..."
else
    echo "No changes detected in PKGBUILD or .SRCINFO"
    exit 0
fi

# Commit and push changes
echo "Committing changes..."
git add PKGBUILD .SRCINFO VERSION
git commit -m "Update to latest master commit

Automated update from GitHub Actions
Commit: ${GITHUB_SHA}
"

echo "Pushing to AUR..."
git push origin master

echo "AUR package updated successfully!"

# Cleanup
cd /
rm -rf "$TEMP_DIR"
rm -rf "$BUILDDIR"
rm -f ~/.ssh/aur_rsa