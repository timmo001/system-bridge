#!/bin/sh
# Setup Arch Linux for building packages

pacman -Syu --noconfirm
pacman -S --noconfirm base-devel sudo

useradd -m builduser
echo 'builduser ALL=(ALL) NOPASSWD: ALL' > /etc/sudoers.d/builduser
mkdir -p /home/builduser/build
cp -r /build/* /home/builduser/build/
chown -R builduser:builduser /home/builduser/build
cd /home/builduser/build/.scripts/linux

su builduser -c './create-arch.sh'

find /home/builduser/build -name '*.pkg.tar.zst' -exec cp {} /build/dist/