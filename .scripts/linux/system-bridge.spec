Name:           system-bridge
Version:        %{_version}
Release:        %{_release}
Summary:        System Bridge

License:        Apache-2.0
ExclusiveArch:  x86_64

# Optional runtime tools that improve hardware detection when present.
Recommends:     pciutils
Suggests:       lm_sensors
Suggests:       nvidia-smi

%description
A bridge for your systems.

%install
mkdir -p %{buildroot}/usr/bin
mkdir -p %{buildroot}/usr/share/applications
mkdir -p %{buildroot}/usr/share/icons/hicolor/scalable/apps
mkdir -p %{buildroot}/usr/share/icons/hicolor/16x16/apps
mkdir -p %{buildroot}/usr/share/icons/hicolor/32x32/apps
mkdir -p %{buildroot}/usr/share/icons/hicolor/48x48/apps
mkdir -p %{buildroot}/usr/share/icons/hicolor/128x128/apps
mkdir -p %{buildroot}/usr/share/icons/hicolor/256x256/apps
mkdir -p %{buildroot}/usr/share/icons/hicolor/512x512/apps

cp %{_stagedir}/bin/system-bridge %{buildroot}/usr/bin/
cp %{_stagedir}/bin/system-bridge-tui %{buildroot}/usr/bin/
cp %{_stagedir}/share/applications/system-bridge.desktop %{buildroot}/usr/share/applications/
cp %{_stagedir}/share/icons/hicolor/scalable/apps/system-bridge.svg %{buildroot}/usr/share/icons/hicolor/scalable/apps/
cp %{_stagedir}/share/icons/hicolor/16x16/apps/system-bridge.png %{buildroot}/usr/share/icons/hicolor/16x16/apps/
cp %{_stagedir}/share/icons/hicolor/32x32/apps/system-bridge.png %{buildroot}/usr/share/icons/hicolor/32x32/apps/
cp %{_stagedir}/share/icons/hicolor/48x48/apps/system-bridge.png %{buildroot}/usr/share/icons/hicolor/48x48/apps/
cp %{_stagedir}/share/icons/hicolor/128x128/apps/system-bridge.png %{buildroot}/usr/share/icons/hicolor/128x128/apps/
cp %{_stagedir}/share/icons/hicolor/256x256/apps/system-bridge.png %{buildroot}/usr/share/icons/hicolor/256x256/apps/
cp %{_stagedir}/share/icons/hicolor/512x512/apps/system-bridge.png %{buildroot}/usr/share/icons/hicolor/512x512/apps/

mkdir -p %{buildroot}/usr/share/bash-completion/completions
mkdir -p %{buildroot}/usr/share/zsh/site-functions
mkdir -p %{buildroot}/usr/share/fish/vendor_completions.d
cp %{_stagedir}/share/bash-completion/completions/system-bridge %{buildroot}/usr/share/bash-completion/completions/
cp %{_stagedir}/share/zsh/site-functions/_system-bridge %{buildroot}/usr/share/zsh/site-functions/
cp %{_stagedir}/share/fish/vendor_completions.d/system-bridge.fish %{buildroot}/usr/share/fish/vendor_completions.d/

%files
/usr/bin/system-bridge
/usr/bin/system-bridge-tui
/usr/share/applications/system-bridge.desktop
/usr/share/icons/hicolor/scalable/apps/system-bridge.svg
/usr/share/icons/hicolor/16x16/apps/system-bridge.png
/usr/share/icons/hicolor/32x32/apps/system-bridge.png
/usr/share/icons/hicolor/48x48/apps/system-bridge.png
/usr/share/icons/hicolor/128x128/apps/system-bridge.png
/usr/share/icons/hicolor/256x256/apps/system-bridge.png
/usr/share/icons/hicolor/512x512/apps/system-bridge.png
/usr/share/bash-completion/completions/system-bridge
/usr/share/zsh/site-functions/_system-bridge
/usr/share/fish/vendor_completions.d/system-bridge.fish
