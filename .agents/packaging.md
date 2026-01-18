# Package Creation

## Linux Packaging

**Note:** Run on Linux host only

```bash
# Build all formats in parallel (DEB, RPM, Arch, Flatpak)
make create_all_packages

# Individual formats
make create_deb           # Debian package only
make create_rpm           # RPM package only
make create_arch          # Arch package only
make create_flatpak       # Flatpak package only
```

## Windows Installer

```bash
make create_windows_installer
```
