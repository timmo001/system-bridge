Name:           system-bridge
Version:        %{_version}
Release:        1%{?dist}
Summary:        System Bridge

License:        Apache-2.0

%description
A bridge for your systems.

%install
mkdir -p %{buildroot}/usr/bin
cp %{_builddir}/usr/bin/system-bridge %{buildroot}/usr/bin/

%files
/usr/bin/system-bridge
/usr/share/icons/hicolor/512x512/apps/system-bridge.png
