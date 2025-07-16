#!/bin/bash

set -x
set -e

echo "==> Starting update-aur.sh script"
# Configuration
echo "==> Setting AUR package variables"
AUR_PACKAGE_NAME="system-bridge-git"
AUR_REPO_URL="ssh://aur@aur.archlinux.org/${AUR_PACKAGE_NAME}.git"

echo "==> Checking required environment variables"
# Check required environment variables
if [ -z "$AUR_SSH_PRIVATE_KEY" ]; then
    echo "Error: AUR_SSH_PRIVATE_KEY environment variable is required"
    exit 1
fi

echo "==> Setting up SSH for AUR"
# Setup SSH for AUR
mkdir -p ~/.ssh
echo "$AUR_SSH_PRIVATE_KEY" > ~/.ssh/aur_rsa
chmod 600 ~/.ssh/aur_rsa

# Add AUR to known hosts dynamically
echo "==> Adding AUR host key..."
if ssh-keyscan -H aur.archlinux.org >> ~/.ssh/known_hosts 2>/dev/null; then
    echo "Successfully added AUR host key"
    STRICT_HOST_CHECKING=""
else
    echo "Warning: Could not fetch AUR host key via ssh-keyscan, disabling host key verification"
    STRICT_HOST_CHECKING="StrictHostKeyChecking no"
fi

# Configure SSH to use the AUR key
echo "==> Configuring SSH to use the AUR key"
cat << EOF > ~/.ssh/config
Host aur.archlinux.org
  IdentityFile ~/.ssh/aur_rsa
  User aur
  ${STRICT_HOST_CHECKING}
EOF

# Set up git config
echo "==> Setting up global git config"
git config --global user.name "System Bridge Bot"
git config --global user.email "github-actions@timmo001.com"

# Create temporary directory
echo "==> Creating temporary directory"
TEMP_DIR=$(mktemp -d)
echo "TEMP_DIR is $TEMP_DIR"
cd "$TEMP_DIR"
echo "==> Changed directory to $TEMP_DIR"

# Clone AUR repository
echo "==> Cloning AUR repository..."
git clone "$AUR_REPO_URL" aur-repo
echo "==> Finished git clone"
cd aur-repo
echo "==> Changed directory to aur-repo"

# Configure Git to allow operations on this repository
echo "==> Configuring git safe.directory"
git config --global --add safe.directory "$(pwd)"

# Create a non-root user for makepkg if it doesn't exist
echo "==> Creating builduser if needed"
id -u builduser &>/dev/null || useradd -m builduser
echo "==> Ensuring builduser can access working directory"
# Ensure builduser can access the working directory and all parent directories
chmod 755 "$TEMP_DIR"
chown -R builduser:builduser .

# Copy the updated PKGBUILD and configure for AUR
echo "==> Copying updated PKGBUILD"
cp "$GITHUB_WORKSPACE/.scripts/linux/PKGBUILD" PKGBUILD
echo "==> Copied PKGBUILD"

# Create a build directory that builduser can access
echo "==> Creating build directory for builduser"
export BUILDDIR="/tmp/makepkg-build"
mkdir -p "$BUILDDIR"
chown -R builduser:builduser "$BUILDDIR"

# Update .SRCINFO with AUR configuration as builduser
echo "==> Generating .SRCINFO as builduser"
echo "::group::Generating .SRCINFO"
sudo -u builduser env -i HOME="$HOME" BUILDDIR="$BUILDDIR" bash --noprofile --norc -c 'makepkg --printsrcinfo > .SRCINFO'
echo "::endgroup::"
echo "==> Generated .SRCINFO"

echo "::group::PKGBUILD"
cat PKGBUILD
echo "::endgroup::"

echo "::group::.SRCINFO"
cat .SRCINFO
echo "::endgroup::"

echo "::group::Git status"
git status
echo "::endgroup::"

echo "::group::Git diff"
git diff
echo "::endgroup::"

echo "==> Checking for changes..."
# Check if there are changes - use a more robust method
if git status --porcelain | grep -q .; then
    echo "Changes detected, proceeding with commit..."
else
    echo "No changes detected in PKGBUILD or .SRCINFO"
    exit 0
fi

echo "==> Committing changes..."
# Commit and push changes
git add -f PKGBUILD .SRCINFO
git commit -m "Update to latest master commit

Automated update from GitHub Actions
Commit: ${GITHUB_SHA}
"
echo "==> Pushing to AUR..."
git push origin master
echo "==> AUR package updated successfully!"

echo "==> Cleaning up temporary files"
# Cleanup
cd /
echo "==> Removing $TEMP_DIR and $BUILDDIR"
rm -rf "$TEMP_DIR"
rm -rf "$BUILDDIR"
echo "==> Removing SSH key ~/.ssh/aur_rsa"
rm -f ~/.ssh/aur_rsa
echo "==> Script complete"
