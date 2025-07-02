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

# Add AUR to known hosts
echo "aur.archlinux.org,95.216.144.15 ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBLMiLrP8pVi5BFX2i3vepSUnpedeiewE5XptnUnau+ZoeUOPkpoCgZZuYfpaIQfhhJJI5qgnjJmr4hyJbe/zxow=" >> ~/.ssh/known_hosts

# Configure SSH to use the AUR key
cat << EOF > ~/.ssh/config
Host aur.archlinux.org
  IdentityFile ~/.ssh/aur_rsa
  User aur
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

# Copy the updated PKGBUILD
echo "Updating PKGBUILD..."
cp "$GITHUB_WORKSPACE/.scripts/linux/PKGBUILD.aur-git" PKGBUILD

# Update .SRCINFO
echo "Generating .SRCINFO..."
makepkg --printsrcinfo > .SRCINFO

# Check if there are changes
if git diff --quiet; then
    echo "No changes detected in PKGBUILD or .SRCINFO"
    exit 0
fi

# Commit and push changes
echo "Committing changes..."
git add PKGBUILD .SRCINFO
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
rm -f ~/.ssh/aur_rsa