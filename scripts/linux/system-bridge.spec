Name:           system-bridge
Version:        %{_version}
Release:        %{_release}
Summary:        System Bridge

License:        Apache-2.0

%description
A bridge for your systems.

%install
mkdir -p %{buildroot}/usr/bin
mkdir -p %{buildroot}/usr/share/icons/hicolor/512x512/apps
cp %{_builddir}/usr/bin/system-bridge %{buildroot}/usr/bin/
cp %{_builddir}/usr/share/icons/hicolor/512x512/apps/system-bridge.png %{buildroot}/usr/share/icons/hicolor/512x512/apps/

%files
/usr/bin/system-bridge
/usr/share/icons/hicolor/512x512/apps/system-bridge.png
