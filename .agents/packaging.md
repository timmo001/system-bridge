# Package Creation

## Linux Packaging

**Note:** Run on Linux host only

```bash
# Build all formats in parallel (DEB, RPM, Arch, Flatpak)
mise run create_all_packages

# Individual formats
mise run create_deb           # Debian package only
mise run create_rpm           # RPM package only
mise run create_arch          # Arch package only
mise run create_flatpak       # Flatpak package only
```

## Windows Installer

```bash
mise run create_windows_installer
```
